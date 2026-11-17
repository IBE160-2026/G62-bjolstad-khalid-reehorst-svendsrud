import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
const searchMock = vi.hoisted(() => ({ value: "" }));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(searchMock.value),
}));
vi.mock("@/modules/food/meals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/food/meals")>()),
  osloToday: () => "2026-11-17",
}));

import { useAddFoodEntry } from "@/modules/food/api";
import type { Workout } from "@/modules/workouts/api";

import { kcalText, parseDateParam, roundKcal, type Overview, type OverviewSet } from "./api";
import { TodayPage } from "./today-page";
import { setsText } from "./training-card";

const TODAY = "2026-11-17";
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

function entry(name: string, kcal: number, meal: (typeof MEALS)[number]) {
  return {
    id: `entry-${name}`,
    food_item_id: `item-${name}`,
    name,
    source: "matvaretabellen" as const,
    serving_size_g: null,
    date: TODAY,
    meal,
    grams: 150,
    kcal_per_100g_snapshot: kcal / 1.5,
    kcal,
    created_at: "2026-11-17T08:00:00Z",
  };
}

function overview(changes: Partial<Overview> = {}, entries: ReturnType<typeof entry>[] = []) {
  const meals = MEALS.map((meal) => {
    const inMeal = entries.filter((item) => item.meal === meal);
    return {
      meal,
      entries: inMeal,
      total_kcal: inMeal.reduce((sum, item) => sum + item.kcal, 0),
    };
  });
  const eaten = entries.reduce((sum, item) => sum + item.kcal, 0);
  return {
    date: TODAY,
    calorie_target: 1640,
    kcal_eaten: eaten,
    kcal_remaining: 1640 - eaten,
    meals,
    workouts: [],
    ...changes,
  } satisfies Overview;
}

function doneSet(position: number, reps: number | null, weight: number | null = null) {
  return { id: `set-${position}`, position, reps, weight_kg: weight, seconds: null, done: true };
}

const PUSH_UP_WORKOUT: Workout = {
  id: "w-1",
  date: TODAY,
  finished_at: "2026-11-17T18:00:00Z",
  exercises: [
    {
      id: "we-1",
      exercise_id: "e-push-up",
      name: "Armhevinger",
      level: "beginner",
      type: "reps",
      primary_muscle_group: "Bryst",
      equipment: ["Kroppsvekt"],
      sets: [doneSet(0, 10), doneSet(1, 10), doneSet(2, 10)],
      last_time: { date: "2026-11-03", sets: [{ reps: 8, weight_kg: null, seconds: null }] },
    },
  ],
};

let client: QueryClient;
let current: Overview | { error: { code: string; message: string } };
let active: Workout | null;

function renderPage() {
  return render(
    <QueryClientProvider client={client}>
      <TodayPage />
    </QueryClientProvider>,
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchMock.value = "";
  active = null;
  current = overview();
  apiMock.GET.mockImplementation(async (path: string) => {
    if (path === "/api/overview") return "error" in current ? { error: current } : { data: current };
    if (path === "/api/workouts/active") return { data: { workout: active } };
    if (path === "/api/overview/week") return { data: [] };
    throw new Error(`unexpected GET ${path}`);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function note() {
  return screen.findByTestId("day-note");
}

describe("acceptance", () => {
  it("shows kcal left, the meals and the workout's done sets", async () => {
    current = overview(
      { workouts: [PUSH_UP_WORKOUT] },
      [entry("Yoghurt", 900, "breakfast"), entry("Pasta", 520, "dinner")],
    );
    renderPage();

    expect(await note()).toHaveTextContent("220 kcal igjen av dagens mål på 1 640");
    // The top bar says "I dag"; the page adds no second "I dag" heading.
    expect(screen.queryByRole("heading", { level: 2, name: "I dag" })).not.toBeInTheDocument();
    const food = screen.getByTestId("food-card");
    expect(within(food).getByText("Frokost")).toBeInTheDocument();
    expect(within(food).getByText("Yoghurt")).toBeInTheDocument();
    expect(within(food).getByText("900 kcal", { selector: "li li span" })).toBeInTheDocument();
    expect(within(food).getByRole("link", { name: "Legg til i lunsj" })).toHaveAttribute(
      "href",
      "/mat",
    );
    expect(within(food).getByRole("link", { name: "Mat" })).toHaveAttribute("href", "/mat");
    const training = screen.getByTestId("training-card");
    expect(training).toHaveTextContent("Armhevinger 3 × 10");
    expect(training).toHaveTextContent("Sist: 8 rep (3. nov)");
    expect(within(training).getByRole("link", { name: "Økt" })).toHaveAttribute(
      "href",
      "/trening/okt/w-1",
    );
    expect(within(training).getByRole("link", { name: "Trening" })).toHaveAttribute(
      "href",
      "/trening",
    );
    expect(apiMock.GET).toHaveBeenCalledWith("/api/overview", {
      params: { query: { date: TODAY } },
    });
  });

  it("a new user is invited to log a meal and start a workout", async () => {
    renderPage();

    expect(await note()).toHaveTextContent("1 640 kcal igjen av dagens mål på 1 640");
    expect(screen.getByRole("link", { name: "Logg ditt første måltid i dag" })).toHaveAttribute(
      "href",
      "/mat",
    );
    expect(screen.getByRole("link", { name: "Start en økt" })).toHaveAttribute(
      "href",
      "/trening",
    );
    expect(screen.queryByText("Ingenting logget denne dagen.")).not.toBeInTheDocument();
  });
});

describe("day note", () => {
  it("over the target: a calm number and a supportive sentence", async () => {
    current = overview({}, [entry("Pizza", 1760, "dinner")]);
    renderPage();

    const dayNote = await note();
    expect(dayNote).toHaveTextContent("120 kcal over");
    expect(dayNote).toHaveTextContent(
      "Du er 120 kcal over målet i dag. Det går fint, i morgen er en ny dag.",
    );
    expect(dayNote.querySelector(".text-destructive")).toBeNull();
  });

  it("without a profile it asks for one", async () => {
    current = overview({ calorie_target: null, kcal_remaining: null });
    renderPage();

    expect(await note()).toHaveTextContent(/^Fyll inn profilen for å få dagens mål\.$/);
    expect(
      screen.getByRole("link", { name: "Fyll inn profilen for å få dagens mål." }),
    ).toHaveAttribute(
      "href",
      "/profiloppsett",
    );
  });
});

describe("workouts", () => {
  it("numbers the workout links when there are several", async () => {
    current = overview({
      workouts: [PUSH_UP_WORKOUT, { ...PUSH_UP_WORKOUT, id: "w-2", finished_at: null }],
    });
    renderPage();

    const training = await screen.findByTestId("training-card");
    expect(within(training).getByRole("link", { name: "Økt 1" })).toHaveAttribute(
      "href",
      "/trening/okt/w-1",
    );
    expect(within(training).getByRole("link", { name: "Økt 2 som pågår" })).toHaveAttribute(
      "href",
      "/trening/okt/w-2",
    );
  });
});

describe("actions", () => {
  it("has exactly Logg mat and Start økt", async () => {
    renderPage();
    await note();

    expect(screen.getByRole("link", { name: "Logg mat" })).toHaveAttribute("href", "/mat");
    expect(screen.getByRole("link", { name: "Start økt" })).toHaveAttribute("href", "/trening");
  });

  it("says Fortsett økt while a workout is in progress", async () => {
    active = { ...PUSH_UP_WORKOUT, finished_at: null };
    renderPage();

    expect(await screen.findByRole("link", { name: "Fortsett økt" })).toHaveAttribute(
      "href",
      "/trening/okt",
    );
    expect(screen.queryByRole("link", { name: "Start økt" })).not.toBeInTheDocument();
  });
});

describe("dates", () => {
  it("an earlier date with nothing logged says so, and every link keeps the date", async () => {
    searchMock.value = "dato=2026-11-16";
    current = overview({ date: "2026-11-16" });
    renderPage();

    expect(await screen.findByText("Ingenting logget denne dagen.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "mandag 16. november" })).toBeInTheDocument();
    expect(apiMock.GET).toHaveBeenCalledWith("/api/overview", {
      params: { query: { date: "2026-11-16" } },
    });
    expect(await note()).toHaveTextContent("1 640 kcal igjen av målet på 1 640");
    expect(screen.getByRole("link", { name: "Logg mat" })).toHaveAttribute(
      "href",
      "/mat?dato=2026-11-16",
    );
    expect(screen.getByRole("link", { name: "Start økt" })).toHaveAttribute(
      "href",
      "/trening?dato=2026-11-16",
    );
    // The 6.2 prompts show on earlier dates too and act on that date (story 6.3).
    expect(screen.getByRole("link", { name: "Start en økt" })).toHaveAttribute(
      "href",
      "/trening?dato=2026-11-16",
    );
    expect(screen.getByRole("link", { name: "Logg et måltid denne dagen" })).toHaveAttribute(
      "href",
      "/mat?dato=2026-11-16",
    );
    expect(screen.getByRole("link", { name: "Mat" })).toHaveAttribute("href", "/mat?dato=2026-11-16");
    expect(screen.queryByRole("link", { name: /^Logg ditt første/ })).not.toBeInTheDocument();
  });

  it("an earlier date's empty Meal links to Mat for that date", async () => {
    searchMock.value = "dato=2026-11-16";
    current = overview({ date: "2026-11-16" }, [entry("Yoghurt", 140, "breakfast")]);
    renderPage();

    const food = await screen.findByTestId("food-card");
    expect(within(food).getByRole("link", { name: "Legg til i lunsj" })).toHaveAttribute(
      "href",
      "/mat?dato=2026-11-16",
    );
  });

  it("an earlier date over the target does not talk about today", async () => {
    searchMock.value = "dato=2026-11-16";
    current = overview({ date: "2026-11-16" }, [entry("Pizza", 1760, "dinner")]);
    renderPage();

    const dayNote = await note();
    expect(dayNote).toHaveTextContent("120 kcal over");
    expect(dayNote).toHaveTextContent("Du er 120 kcal over målet denne dagen.");
    expect(dayNote).not.toHaveTextContent(/i dag|i morgen/);
  });

  it("a future dato falls back to today and says so once", async () => {
    searchMock.value = "dato=2026-11-18";
    renderPage();
    await note();

    expect(await screen.findByText("Du kan ikke velge en dag fram i tid.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(routerMock.replace).toHaveBeenCalledWith("/");

    expect(apiMock.GET).toHaveBeenCalledWith("/api/overview", {
      params: { query: { date: TODAY } },
    });
    // The top bar says "I dag"; the page adds no second "I dag" heading.
    expect(screen.queryByRole("heading", { level: 2, name: "I dag" })).not.toBeInTheDocument();
  });

  it("a bad dato falls back to today", async () => {
    searchMock.value = "dato=2026-02-30";
    renderPage();
    await note();

    expect(apiMock.GET).toHaveBeenCalledWith("/api/overview", {
      params: { query: { date: TODAY } },
    });
  });
});

describe("loading and errors", () => {
  it("shows skeletons while loading", () => {
    apiMock.GET.mockImplementation(() => new Promise(() => {}));
    renderPage();

    const skeleton = screen.getByTestId("overview-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveTextContent("Laster dagen …");
  });

  it("shows the error and tries again", async () => {
    current = { error: { code: "date_in_future", message: "Velg i dag eller en tidligere dato." } };
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Velg i dag eller en tidligere dato.",
    );
    current = overview();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await note()).toHaveTextContent("1 640 kcal igjen");
  });
});

describe("refresh (AD-15)", () => {
  it("logging food refetches the overview for its date", async () => {
    renderPage();
    expect(await note()).toHaveTextContent("1 640 kcal igjen");

    const saved = entry("Yoghurt", 140, "breakfast");
    apiMock.POST.mockResolvedValue({ data: saved });
    current = overview({}, [saved]);
    const { result } = renderHook(() => useAddFoodEntry(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        food_item_id: saved.food_item_id,
        date: TODAY,
        meal: "breakfast",
        grams: 150,
      }),
    );

    await waitFor(async () =>
      expect(await note()).toHaveTextContent("1 500 kcal igjen av dagens mål på 1 640"),
    );
  });
});

describe("week strip refresh (story 6.3)", () => {
  it("a food entry change refetches its week's marks", async () => {
    const saved = { ...entry("Yoghurt", 140, "breakfast"), date: "2026-11-12" };
    apiMock.POST.mockResolvedValue({ data: saved });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAddFoodEntry(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        food_item_id: saved.food_item_id,
        date: "2026-11-12",
        meal: "breakfast",
        grams: 150,
      }),
    );

    // 12 November 2026 is a Thursday; its week starts on Monday the 9th.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["overview-week", "2026-11-09"] });
  });
});

describe("formatting", () => {
  const set = (reps: number | null, weight: number | null, seconds: number | null = null) =>
    ({ id: "s", position: 0, reps, weight_kg: weight, seconds, done: true }) as OverviewSet;

  it("sets in short form when they match, else listed", () => {
    expect(setsText([set(10, 10), set(10, 10), set(10, 10)])).toBe("3 × 10 · 10 kg");
    expect(setsText([set(10, null), set(10, null)])).toBe("2 × 10");
    expect(setsText([set(null, null, 45), set(null, null, 45)])).toBe("2 × 45 s");
    expect(setsText([set(10, 12.5), set(8, 12.5)])).toBe("12,5 kg × 10, 12,5 kg × 8");
    expect(setsText([set(null, null), set(null, null)])).toBe("2 sett");
  });

  it("rounds half up with a space as thousands separator", () => {
    expect(roundKcal(220.5)).toBe(221);
    expect(roundKcal(-120.5)).toBe(-120);
    expect(roundKcal(-120.6)).toBe(-121);
    expect(Object.is(roundKcal(-0.4), 0)).toBe(true);
    expect(roundKcal(219.4)).toBe(219);
    expect(kcalText(1640)).toBe("1 640");
    expect(kcalText(12345.6)).toBe("12 346");
  });

  it("accepts only real dates", () => {
    expect(parseDateParam("2026-11-16", TODAY)).toBe("2026-11-16");
    expect(parseDateParam("2026-11-17", TODAY)).toBe("2026-11-17");
    expect(parseDateParam("2026-11-18", TODAY)).toBeNull();
    expect(parseDateParam("2026-02-30", TODAY)).toBeNull();
    expect(parseDateParam("i-dag", TODAY)).toBeNull();
    expect(parseDateParam(null, TODAY)).toBeNull();
  });
});
