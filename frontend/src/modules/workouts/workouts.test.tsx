import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  DELETE: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/modules/food/meals", () => ({ osloToday: () => "2026-11-17" }));

import { AddToWorkout } from "./add-to-workout";
import { exerciseCountText, moveId, workoutDateText, type Workout } from "./api";
import { StartWorkout } from "./start-workout";
import { WorkoutPage } from "./workout-page";

const PUSH_UP = {
  exercise_id: "e-push-up",
  name: "Armhevinger (Push-up)",
  level: "beginner" as const,
  primary_muscle_group: "Bryst",
  equipment: ["Kroppsvekt"],
};
const SQUAT = {
  exercise_id: "e-squat",
  name: "Kroppsvektknebøy (Bodyweight squat)",
  level: "beginner" as const,
  primary_muscle_group: "Ben",
  equipment: ["Kroppsvekt"],
};
const PLANK = {
  exercise_id: "e-plank",
  name: "Planke (Plank)",
  level: "beginner" as const,
  primary_muscle_group: "Mage/kjerne",
  equipment: ["Kroppsvekt"],
};
const CATALOG = Object.fromEntries([PUSH_UP, SQUAT, PLANK].map((e) => [e.exercise_id, e]));

type Answer = { data?: unknown; error?: unknown };

/** A tiny in-memory backend with the rules of /api/workouts. */
class FakeServer {
  workout: Workout | null = null;
  private next = 1;

  private copy(): Answer {
    return { data: structuredClone(this.workout), error: undefined };
  }

  install() {
    apiMock.GET.mockImplementation(async (path: string): Promise<Answer> => {
      if (path === "/api/workouts/active") {
        return { data: { workout: structuredClone(this.workout) }, error: undefined };
      }
      throw new Error(`unexpected GET ${path}`);
    });
    apiMock.POST.mockImplementation(
      async (
        path: string,
        init: { body: Record<string, string>; params?: { path: { workout_id: string } } },
      ): Promise<Answer> => {
        if (path === "/api/workouts") {
          this.workout ??= { id: `w-new-${this.next++}`, date: init.body.date, exercises: [] };
          return this.copy();
        }
        if (path === "/api/workouts/{workout_id}/exercises") {
          if (this.workout?.id !== init.params!.path.workout_id) {
            const message = "Fant ikke økta. Gå tilbake til Trening og prøv igjen.";
            return { error: { error: { code: "workout_not_found", message } } };
          }
          const exercise = CATALOG[init.body.exercise_id];
          if (this.workout!.exercises.some((e) => e.exercise_id === exercise.exercise_id)) {
            const message = "Øvelsen er allerede i økta.";
            return { error: { error: { code: "exercise_already_in_workout", message } } };
          }
          this.workout!.exercises.push({ id: `we-${this.next++}`, ...exercise });
          return this.copy();
        }
        throw new Error(`unexpected POST ${path}`);
      },
    );
    apiMock.PUT.mockImplementation(async (_path: string, init: { body: { ids: string[] } }) => {
      const byId = new Map(this.workout!.exercises.map((e) => [e.id, e]));
      this.workout!.exercises = init.body.ids.map((id) => byId.get(id)!);
      return this.copy();
    });
    apiMock.DELETE.mockImplementation(
      async (_path: string, init: { params: { path: { workout_exercise_id: string } } }) => {
        const id = init.params.path.workout_exercise_id;
        this.workout!.exercises = this.workout!.exercises.filter((e) => e.id !== id);
        return this.copy();
      },
    );
    return this;
  }
}

let server: FakeServer;
let client: QueryClient;

function renderWith(ui: ReactNode) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function names(): string[] {
  const list = screen.getByRole("list", { name: "Øvelser i økta" });
  return within(list)
    .getAllByRole("link")
    .map((link) => link.querySelector("span")!.textContent!);
}

/** The button is disabled until the active workout is known. */
async function clickAddWhenReady() {
  const button = await screen.findByRole("button", { name: "Legg til i økt" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

beforeEach(() => {
  server = new FakeServer().install();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("acceptance", () => {
  it("start, add Armhevinger and Kroppsvektknebøy, move it up, then continue", async () => {
    const trening = renderWith(<StartWorkout />);
    fireEvent.click(await screen.findByRole("button", { name: "Start økt" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/trening/okt"));
    expect(apiMock.POST).toHaveBeenCalledWith("/api/workouts", { body: { date: "2026-11-17" } });
    trening.unmount();

    for (const exercise of [PUSH_UP, SQUAT]) {
      const detail = renderWith(<AddToWorkout exerciseId={exercise.exercise_id} />);
      await clickAddWhenReady();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent("Lagt til i økta."),
      );
      const link = screen.getByRole("link", { name: "Gå til økta" });
      expect(link).toHaveAttribute("href", "/trening/okt");
      // The button is gone, so focus moves to the link instead of dropping to the body.
      await waitFor(() => expect(link).toHaveFocus());
      detail.unmount();
    }

    const page = renderWith(<WorkoutPage />);
    expect(await screen.findByRole("heading", { name: "tirsdag 17. november" })).toBeInTheDocument();
    expect(names()).toEqual([PUSH_UP.name, SQUAT.name]);
    fireEvent.click(screen.getByRole("button", { name: `Flytt opp: ${SQUAT.name}` }));
    await waitFor(() => expect(names()).toEqual([SQUAT.name, PUSH_UP.name]));
    expect(
      screen.getByText(`${SQUAT.name} flyttet til plass 1 av 2.`),
    ).toHaveAttribute("aria-live", "polite");
    page.unmount();

    renderWith(<StartWorkout />);
    expect(await screen.findByRole("link", { name: "Fortsett økt · 2 øvelser" })).toHaveAttribute(
      "href",
      "/trening/okt",
    );
  });
});

describe("StartWorkout", () => {
  it("shows Start økt when no workout is in progress", async () => {
    renderWith(<StartWorkout />);
    expect(await screen.findByRole("button", { name: "Start økt" })).toBeEnabled();
  });

  it("shows Fortsett økt with the count when one is in progress", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", exercises: [{ id: "we-1", ...PLANK }] };
    renderWith(<StartWorkout />);
    expect(await screen.findByRole("link", { name: "Fortsett økt · 1 øvelse" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start økt" })).not.toBeInTheDocument();
  });
});

describe("StartWorkout errors", () => {
  it("shows the message and stays when starting fails", async () => {
    apiMock.POST.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    renderWith(<StartWorkout />);
    fireEvent.click(await screen.findByRole("button", { name: "Start økt" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt. Prøv igjen om litt.");
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start økt" })).toBeEnabled();
  });
});

describe("AddToWorkout", () => {
  it("on 409 shows the message, then Allerede i økta", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", exercises: [] };
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);
    const button = await screen.findByRole("button", { name: "Legg til i økt" });
    await waitFor(() => expect(button).toBeEnabled());
    // Added in another tab after this page loaded.
    server.workout.exercises.push({ id: "we-9", ...PUSH_UP });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent("Øvelsen er allerede i økta.");
    expect(await screen.findByRole("button", { name: "Allerede i økta" })).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("starts a new workout and retries once when the known one is gone", async () => {
    server.workout = { id: "w-old", date: "2026-11-16", exercises: [] };
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);
    const button = await screen.findByRole("button", { name: "Legg til i økt" });
    await waitFor(() => expect(button).toBeEnabled());
    server.workout = null; // finished or deleted elsewhere
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Lagt til i økta."));
    expect(apiMock.POST.mock.calls.map(([path]) => path)).toEqual([
      "/api/workouts/{workout_id}/exercises",
      "/api/workouts",
      "/api/workouts/{workout_id}/exercises",
    ]);
    expect((server.workout as Workout | null)?.exercises.map((e) => e.exercise_id)).toEqual([PUSH_UP.exercise_id]);
  });

  it("starts a workout for today when none is in progress, then adds", async () => {
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);
    await clickAddWhenReady();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Lagt til i økta."));
    expect(apiMock.POST.mock.calls.map(([path]) => path)).toEqual([
      "/api/workouts",
      "/api/workouts/{workout_id}/exercises",
    ]);
    expect(server.workout?.date).toBe("2026-11-17");
    expect(server.workout?.exercises.map((e) => e.exercise_id)).toEqual([PUSH_UP.exercise_id]);
  });

  it("adds to the workout in progress without starting another", async () => {
    server.workout = { id: "w-1", date: "2026-11-16", exercises: [] };
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);
    await clickAddWhenReady();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Lagt til i økta."));
    expect(apiMock.POST.mock.calls.map(([path]) => path)).toEqual([
      "/api/workouts/{workout_id}/exercises",
    ]);
  });

  it("shows a disabled Allerede i økta when the exercise is already added", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", exercises: [{ id: "we-1", ...PUSH_UP }] };
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);

    expect(await screen.findByRole("button", { name: "Allerede i økta" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Gå til økta" })).toBeInTheDocument();
  });
});

describe("WorkoutPage", () => {
  beforeEach(() => {
    server.workout = {
      id: "w-1",
      date: "2026-11-17",
      exercises: [
        { id: "we-1", ...PUSH_UP },
        { id: "we-2", ...SQUAT },
        { id: "we-3", ...PLANK },
      ],
    };
  });

  it("lists the exercises in order, each linking to its detail, with move buttons hidden at the ends", async () => {
    renderWith(<WorkoutPage />);

    expect(await screen.findByRole("heading", { name: "tirsdag 17. november" })).toBeInTheDocument();
    expect(names()).toEqual([PUSH_UP.name, SQUAT.name, PLANK.name]);
    expect(screen.getByRole("link", { name: /Armhevinger/ })).toHaveAttribute(
      "href",
      "/trening/ovelser/e-push-up",
    );
    expect(screen.queryByRole("button", { name: `Flytt opp: ${PUSH_UP.name}` })).toBeNull();
    expect(screen.queryByRole("button", { name: `Flytt ned: ${PLANK.name}` })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Fjern / })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Legg til øvelse" })).toHaveAttribute(
      "href",
      "/trening",
    );
  });

  it("keeps focus on the moved row's button, or its other one at an end", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Flytt ned: ${SQUAT.name}` }));

    await waitFor(() => expect(names()).toEqual([PUSH_UP.name, PLANK.name, SQUAT.name]));
    // Squat is last now, so its "Flytt ned" is gone; focus goes to its "Flytt opp".
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Flytt opp: ${SQUAT.name}` })).toHaveFocus(),
    );
    expect(apiMock.PUT).toHaveBeenCalledWith("/api/workouts/{workout_id}/exercises/order", {
      params: { path: { workout_id: "w-1" } },
      body: { ids: ["we-1", "we-3", "we-2"] },
    });

    fireEvent.click(screen.getByRole("button", { name: `Flytt opp: ${PLANK.name}` }));
    await waitFor(() => expect(names()).toEqual([PLANK.name, PUSH_UP.name, SQUAT.name]));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Flytt ned: ${PLANK.name}` })).toHaveFocus(),
    );
  });

  it("removes an exercise and keeps the others in order", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Fjern ${SQUAT.name}` }));

    await waitFor(() => expect(names()).toEqual([PUSH_UP.name, PLANK.name]));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Fjern ${PLANK.name}` })).toHaveFocus(),
    );
  });

  it("after removing the last row, focus goes to the previous row's Fjern", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Fjern ${PLANK.name}` }));

    await waitFor(() => expect(names()).toEqual([PUSH_UP.name, SQUAT.name]));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Fjern ${SQUAT.name}` })).toHaveFocus(),
    );
  });

  it("after removing the only row, focus goes to the heading", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", exercises: [{ id: "we-1", ...PUSH_UP }] };
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Fjern ${PUSH_UP.name}` }));

    expect(await screen.findByText("Økta er tom. Legg til øvelser fra Trening.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "tirsdag 17. november" })).toHaveFocus(),
    );
  });

  it("on a failed move keeps focus on the pressed button; a later remove clears the error", async () => {
    apiMock.PUT.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Flytt ned: ${PUSH_UP.name}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Flytt ned: ${PUSH_UP.name}` })).toHaveFocus(),
    );
    expect(names()).toEqual([PUSH_UP.name, SQUAT.name, PLANK.name]);

    fireEvent.click(screen.getByRole("button", { name: `Fjern ${PLANK.name}` }));
    await waitFor(() => expect(names()).toEqual([PUSH_UP.name, SQUAT.name]));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("invites the next step when the workout is empty", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", exercises: [] };
    renderWith(<WorkoutPage />);

    expect(
      await screen.findByText("Økta er tom. Legg til øvelser fra Trening."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("points to Trening when no workout is in progress", async () => {
    server.workout = null;
    renderWith(<WorkoutPage />);

    expect(await screen.findByText(/Du har ingen økt i gang/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trening" })).toHaveAttribute("href", "/trening");
  });
});

describe("helpers", () => {
  it("formats the date in Norwegian", () => {
    expect(workoutDateText("2026-11-17")).toBe("tirsdag 17. november");
  });

  it("counts exercises", () => {
    expect(exerciseCountText(1)).toBe("1 øvelse");
    expect(exerciseCountText(2)).toBe("2 øvelser");
  });

  it("swaps with a neighbour and ignores moves past the ends", () => {
    expect(moveId(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});
