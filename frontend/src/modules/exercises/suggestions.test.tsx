import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, POST: postMock } }));
// Trening also shows "Start økt" (story 5.1), which navigates with the router.
const searchMock = vi.hoisted(() => ({ value: "" }));
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/trening",
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchMock.value),
}));
vi.mock("@/modules/food/meals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/food/meals")>()),
  osloToday: () => "2026-11-17",
}));

import { profileStorageKey } from "./api";
import { Suggestions, countText, emptyFilteredText, groupByLevel } from "./suggestions";

const USER_ID = "u-ola";
const STORAGE_KEY = profileStorageKey(USER_ID);
const HOME = { id: "p-home", name: "Hjemme", equipment: [] };
const GYM = { id: "p-gym", name: "Treningssenter", equipment: [] };
const EMPTY = { id: "p-empty", name: "Hytta", equipment: [] };

function exercise(
  n: number,
  level: string,
  muscle = "Ben",
  equipment = ["Kroppsvekt"],
  // Test-only: lets the mock filter on secondary muscle groups like the backend.
  secondary: string[] = [],
) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name: `Øvelse ${n}`,
    level,
    primary_muscle_group: muscle,
    equipment,
    secondary,
  };
}

/** "Mage/kjerne" → "mage-kjerne". */
function slug(name: string): string {
  return name.toLowerCase().replace("/", "-");
}

// The backend's order: Nybegynner, Middels, Øvet.
const HOME_EXERCISES = [
  ...Array.from({ length: 6 }, (_, i) => exercise(i + 1, "beginner")),
  exercise(7, "intermediate", "Bryst", ["Kroppsvekt"], ["Armer"]),
  exercise(8, "intermediate", "Mage/kjerne"),
];
const GYM_EXERCISES = [
  ...Array.from({ length: 15 }, (_, i) => exercise(i + 1, "beginner")),
  ...Array.from({ length: 13 }, (_, i) => exercise(i + 16, "intermediate", "Rygg")),
  ...Array.from({ length: 6 }, (_, i) => exercise(i + 29, "advanced", "Bryst", ["Stang og skiver"])),
];
const SUGGESTIONS: Record<string, { name: string; exercises: unknown[] }> = {
  "p-home": { name: "Hjemme", exercises: HOME_EXERCISES },
  "p-gym": { name: "Treningssenter", exercises: GYM_EXERCISES },
  "p-empty": { name: "Hytta", exercises: [] },
};

type Answer = { data?: unknown; error?: unknown };

/** Answer me, the profiles and suggestions. `getProfiles` is read on every call, and
 * `delay` can hold a profile's suggestions back until the test resolves it. */
function mockApi(
  profiles: typeof HOME[] | (() => typeof HOME[]) = [HOME, GYM],
  delay: Record<string, Promise<void>> = {},
) {
  getMock.mockImplementation(
    async (
      path: string,
      init?: { params: { query: { profile_id: string; muscle_group?: string; level?: string } } },
    ): Promise<Answer> => {
      if (path === "/api/identity/me") {
        return { data: { id: USER_ID, email: "ola@eksempel.no" }, error: undefined };
      }
      if (path === "/api/workouts/active") return { data: { workout: null }, error: undefined };
      if (path === "/api/workouts") return { data: [], error: undefined };
      if (path === "/api/exercises/equipment-profiles") {
        return { data: typeof profiles === "function" ? profiles() : profiles, error: undefined };
      }
      if (path === "/api/exercises/suggestions") {
        const id = init!.params.query.profile_id;
        await delay[id];
        const result = SUGGESTIONS[id];
        if (!result) {
          const message = "Fant ikke utstyrsprofilen. Last inn siden på nytt.";
          return { error: { error: { code: "equipment_profile_not_found", message } } };
        }
        // A stand-in for the backend filter (primary or secondary muscle, exact level).
        const { muscle_group: muscle, level } = init!.params.query;
        const exercises = (result.exercises as ReturnType<typeof exercise>[]).filter(
          (item) =>
            (!level || item.level === level) &&
            (!muscle ||
              [item.primary_muscle_group, ...item.secondary].map(slug).includes(muscle)),
        );
        return {
          data: { profile_id: id, profile_name: result.name, exercises },
          error: undefined,
        };
      }
      throw new Error(`unexpected GET ${path}`);
    },
  );
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suggestions />
    </QueryClientProvider>,
  );
}

function suggestionQueries(): Record<string, string>[] {
  return getMock.mock.calls
    .filter(([path]) => path === "/api/exercises/suggestions")
    .map(([, init]) => init.params.query);
}

function suggestionCalls(): string[] {
  return getMock.mock.calls
    .filter(([path]) => path === "/api/exercises/suggestions")
    .map(([, init]) => init.params.query.profile_id);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  getMock.mockReset();
  vi.restoreAllMocks();
});

describe("Suggestions", () => {
  it("shows the first profile's exercises grouped by level, each linking to its detail", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Utstyr" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual([
      "Hjemme",
      "Treningssenter",
    ]);
    expect(screen.getByRole("radio", { name: "Hjemme" })).toBeChecked();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Nybegynner",
      "Middels",
    ]);
    const beginners = screen.getByRole("region", { name: "Nybegynner" });
    expect(within(beginners).getAllByRole("link")).toHaveLength(6);
    const first = within(beginners).getByRole("link", { name: /^Øvelse 1\D/ });
    expect(first).toHaveAttribute("href", `/trening/ovelser/${HOME_EXERCISES[0].id}`);
    expect(first).toHaveTextContent("Ben · Kroppsvekt");
    expect(suggestionCalls()).toEqual(["p-home"]);
  });

  it("switches to Treningssenter at once and remembers the choice", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Nybegynner",
      "Middels",
      "Øvet",
    ]);
    expect(within(screen.getByRole("region", { name: "Øvet" })).getAllByRole("link")).toHaveLength(6);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("p-gym");
  });

  it("selects the last chosen profile after a reload", async () => {
    window.localStorage.setItem(STORAGE_KEY, "p-gym");
    mockApi();
    renderPage();

    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    expect(suggestionCalls()).toEqual(["p-gym"]);
  });

  it("falls back to the first profile when the stored one is gone", async () => {
    window.localStorage.setItem(STORAGE_KEY, "p-deleted");
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("falls back to the first profile when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));
    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
  });

  it("keeps the previous list while the new profile loads", async () => {
    let release!: () => void;
    const gymLoaded = new Promise<void>((resolve) => (release = resolve));
    mockApi([HOME, GYM], { "p-gym": gymLoaded });
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    await waitFor(() => expect(suggestionCalls()).toContain("p-gym"));
    expect(screen.getByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nybegynner" })).toBeInTheDocument();
    expect(screen.queryByTestId("exercise-list-skeleton")).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
  });

  it("falls back to the first profile when the chosen one was deleted elsewhere", async () => {
    const CABIN = { id: "p-cabin", name: "Hytta", equipment: [] };
    let listed = 0;
    window.localStorage.setItem(STORAGE_KEY, "p-cabin");
    // Listed on the first load, then deleted on the server: its suggestions are 404.
    mockApi(() => (listed++ === 0 ? [HOME, GYM, CABIN] : [HOME, GYM]));
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hjemme" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Hytta" })).not.toBeInTheDocument();
    expect(suggestionCalls()).toEqual(["p-cabin", "p-home"]);
  });

  it("says so and links to Profil when there are no profiles", async () => {
    mockApi([]);
    renderPage();

    const message = await screen.findByText(/Du har ingen utstyrsprofiler ennå/);
    expect(within(message).getByRole("link", { name: "Profil → Utstyr" })).toHaveAttribute(
      "href",
      "/profil",
    );
  });

  it("remembers the choice per user", async () => {
    window.localStorage.setItem(profileStorageKey("someone-else"), "p-gym");
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("explains an empty result and links to Profil", async () => {
    mockApi([EMPTY, GYM]);
    renderPage();

    const message = await screen.findByText(/Ingen øvelser passer/);
    expect(message).toHaveTextContent(
      "Ingen øvelser passer med utstyret i «Hytta». Legg til utstyr under Profil → Utstyr.",
    );
    expect(within(message).getByRole("link", { name: "Profil → Utstyr" })).toHaveAttribute(
      "href",
      "/profil",
    );
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows skeleton rows while loading", () => {
    getMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByTestId("exercise-list-skeleton")).toBeInTheDocument();
  });

  it("shows the error and a retry button when suggestions cannot load", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === "/api/identity/me") return { data: { id: USER_ID }, error: undefined };
      if (path === "/api/exercises/equipment-profiles") return { data: [HOME], error: undefined };
      throw new Error("offline");
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    mockApi();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("shows the error when the profiles cannot load", async () => {
    getMock.mockRejectedValue(new Error("offline"));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prøv igjen" })).toBeInTheDocument();
  });
});

describe("Filters", () => {
  it("shows the muscle groups as toggle buttons in order and three level chips", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    const muscles = screen.getByRole("group", { name: "Muskelgruppe" });
    expect(within(muscles).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Skuldre",
      "Bryst",
      "Mage/kjerne",
      "Armer",
      "Ben",
      "Rygg",
    ]);
    const levels = screen.getByRole("group", { name: "Nivå" });
    expect(within(levels).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Nybegynner",
      "Middels",
      "Øvet",
    ]);
    // Only the filter chips (the week strip's days are toggle buttons too).
    const chips = [muscles, levels];
    for (const group of chips) {
      for (const button of within(group).getAllByRole("button", { pressed: false })) {
        expect(button).toHaveClass("min-h-11");
      }
      expect(within(group).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    }
  });

  it("filters at once and names the filters in the count line", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");
    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));
    await screen.findByText("34 øvelser passer med Treningssenter");

    fireEvent.click(screen.getByRole("button", { name: "Bryst" }));
    fireEvent.click(screen.getByRole("button", { name: "Øvet" }));

    expect(
      await screen.findByText("6 øvelser passer med Treningssenter · Bryst · Øvet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bryst" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Øvet" })).toHaveAttribute("aria-pressed", "true");
    expect(suggestionQueries()).toContainEqual({
      profile_id: "p-gym",
      muscle_group: "bryst",
      level: "advanced",
    });
  });

  it("keeps one of each at a time and clears on a second press", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("button", { name: "Bryst" }));
    fireEvent.click(screen.getByRole("button", { name: "Ben" }));
    expect(await screen.findByText("6 øvelser passer med Hjemme · Ben")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bryst" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Ben" }));
    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ben" })).toHaveAttribute("aria-pressed", "false");
    expect(suggestionQueries().at(-1)).toEqual({ profile_id: "p-home" });
  });

  it("matches a secondary muscle group", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("button", { name: "Armer" }));

    expect(await screen.findByText("1 øvelse passer med Hjemme · Armer")).toBeInTheDocument();
  });

  it("names the profile and level when nothing matches (Hjemme + Øvet is empty in the seed)", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("button", { name: "Øvet" }));

    const message = await screen.findByText(/Ingen øvelser passer med Hjemme og Øvet/);
    expect(message).toHaveAttribute("role", "status");
    expect(message).toHaveTextContent(
      "Ingen øvelser passer med Hjemme og Øvet. Prøv et annet nivå eller legg til utstyr. Utstyret ditt finner du under Profil → Utstyr.",
    );
    expect(within(message).getByRole("link", { name: "Profil → Utstyr" })).toHaveAttribute(
      "href",
      "/profil",
    );
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("names every filter and suggests changing them when a stubbed empty answer comes back", async () => {
    mockApi();
    const base = getMock.getMockImplementation()!;
    getMock.mockImplementation(async (path: string, init?: { params: { query: object } }) => {
      if (path === "/api/exercises/suggestions" && "muscle_group" in init!.params.query) {
        return {
          data: { profile_id: "p-home", profile_name: "Hjemme", exercises: [] },
          error: undefined,
        };
      }
      return base(path, init as never);
    });
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("button", { name: "Skuldre" }));
    const muscleOnly = await screen.findByText(/Ingen øvelser passer med Hjemme og Skuldre\./);
    expect(muscleOnly).toHaveAttribute("role", "status");
    expect(muscleOnly).toHaveTextContent("Prøv en annen muskelgruppe eller legg til utstyr.");

    fireEvent.click(screen.getByRole("button", { name: "Middels" }));
    expect(
      await screen.findByText(/Ingen øvelser passer med Hjemme, Skuldre og Middels\./),
    ).toHaveTextContent("Prøv en annen muskelgruppe eller et annet nivå.");
  });

  it("keeps the filters when the profile changes", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");
    fireEvent.click(screen.getByRole("button", { name: "Nybegynner" }));
    await screen.findByText("6 øvelser passer med Hjemme · Nybegynner");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    expect(
      await screen.findByText("15 øvelser passer med Treningssenter · Nybegynner"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nybegynner" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hides the filters while a name search is active", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");
    const base = getMock.getMockImplementation()!;
    getMock.mockImplementation(async (path: string, init?: never) => {
      if (path === "/api/exercises/search") {
        return {
          data: { profile_id: "p-home", profile_name: "Hjemme", exercises: [] },
          error: undefined,
        };
      }
      return base(path, init);
    });

    fireEvent.change(screen.getByLabelText("Søk etter øvelse"), { target: { value: "knebøy" } });

    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Muskelgruppe" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("group", { name: "Nivå" })).not.toBeInTheDocument();
  });
});

describe("helpers", () => {
  it("groups by level in Nybegynner, Middels, Øvet order and hides empty groups", () => {
    const groups = groupByLevel([
      exercise(1, "advanced"),
      exercise(2, "beginner"),
      exercise(3, "advanced"),
    ] as never);
    expect(groups.map((g) => g.level)).toEqual(["beginner", "advanced"]);
    expect(groups[1].exercises.map((e) => e.name)).toEqual(["Øvelse 1", "Øvelse 3"]);
  });

  it("writes the count line", () => {
    expect(countText(8, "Hjemme")).toBe("8 øvelser passer med Hjemme");
    expect(countText(1, "Hytta")).toBe("1 øvelse passer med Hytta");
    expect(countText(3, "Hjemme", ["Bryst", "Nybegynner"])).toBe(
      "3 øvelser passer med Hjemme · Bryst · Nybegynner",
    );
  });

  it("writes the filtered empty message", () => {
    expect(emptyFilteredText("Hjemme", { muscleGroup: "skuldre", level: null })).toBe(
      "Ingen øvelser passer med Hjemme og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr.",
    );
    expect(emptyFilteredText("Hjemme", { muscleGroup: null, level: "advanced" })).toBe(
      "Ingen øvelser passer med Hjemme og Øvet. Prøv et annet nivå eller legg til utstyr.",
    );
    expect(emptyFilteredText("Hjemme", { muscleGroup: "skuldre", level: "advanced" })).toBe(
      "Ingen øvelser passer med Hjemme, Skuldre og Øvet. Prøv en annen muskelgruppe eller et annet nivå.",
    );
  });
});

describe("chosen date (story 6.3)", () => {
  afterEach(() => {
    searchMock.value = "";
  });

  it("with ?dato= says where the workout goes and starts it on that date", async () => {
    searchMock.value = "dato=2026-11-16";
    mockApi();
    postMock.mockResolvedValue({
      data: { id: "w-1", date: "2026-11-16", finished_at: null, exercises: [] },
      error: undefined,
    });
    renderPage();

    const start = await screen.findByRole("button", { name: "Start økt" });
    expect(screen.getByText("Økta lagres på mandag 16. november.")).toBeInTheDocument();
    fireEvent.click(start);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/trening/okt"));
    expect(postMock).toHaveBeenCalledWith("/api/workouts", { body: { date: "2026-11-16" } });
  });
});
