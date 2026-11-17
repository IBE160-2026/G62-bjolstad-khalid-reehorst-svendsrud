import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
const pushMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));
vi.mock("@/modules/food/meals", () => ({ osloToday: () => "2026-11-17" }));

import { AddToWorkout } from "./add-to-workout";
import { RecentWorkouts } from "./recent-workouts";
import {
  exerciseCountText,
  formatNumber,
  lastSetText,
  lastTimeText,
  moveId,
  shortDateText,
  parseNumber,
  recentWorkoutText,
  workoutDateText,
  type WorkoutSummary,
  type LastTime,
  type Workout,
  type WorkoutSet,
} from "./api";
import {
  expectInPoliteLiveRegion,
  expectOpenerSheetFocusCycle,
  installDialogPolyfill,
} from "@/test/sheet-a11y";

import { StartWorkout } from "./start-workout";
import { WorkoutByIdPage, WorkoutPage } from "./workout-page";

const PUSH_UP = {
  exercise_id: "e-push-up",
  name: "Armhevinger (Push-up)",
  level: "beginner" as const,
  primary_muscle_group: "Bryst",
  equipment: ["Kroppsvekt"],
  type: "reps" as const,
  sets: [],
  last_time: null as LastTime | null,
};
const SQUAT = {
  exercise_id: "e-squat",
  name: "Kroppsvektknebøy (Bodyweight squat)",
  level: "beginner" as const,
  primary_muscle_group: "Ben",
  equipment: ["Kroppsvekt"],
  type: "reps" as const,
  sets: [],
  last_time: null as LastTime | null,
};
const PLANK = {
  exercise_id: "e-plank",
  name: "Planke (Plank)",
  level: "beginner" as const,
  primary_muscle_group: "Mage/kjerne",
  equipment: ["Kroppsvekt"],
  type: "time" as const,
  sets: [],
  last_time: null as LastTime | null,
};
const CATALOG = Object.fromEntries([PUSH_UP, SQUAT, PLANK].map((e) => [e.exercise_id, e]));

type Answer = { data?: unknown; error?: unknown };

/** A tiny in-memory backend with the rules of /api/workouts. */
class FakeServer {
  workout: Workout | null = null;
  /** "Tidligere økter" (story 5.4). */
  finished: WorkoutSummary[] = [];
  deleted: string[] = [];
  patches: Partial<WorkoutSet>[] = [];
  private next = 1;

  newSet(position: number): WorkoutSet {
    return {
      id: `s-${this.next++}`,
      position,
      reps: null,
      weight_kg: null,
      seconds: null,
      done: false,
    };
  }

  findSet(id: string) {
    for (const exercise of this.workout!.exercises) {
      const set = exercise.sets.find((s) => s.id === id);
      if (set) return { exercise, set };
    }
    throw new Error(`no set ${id}`);
  }

  private copy(): Answer {
    return { data: structuredClone(this.workout), error: undefined };
  }

  install() {
    apiMock.GET.mockImplementation(
      async (path: string, init?: { params?: { path?: { workout_id: string } } }): Promise<Answer> => {
      if (path === "/api/workouts/active") {
        const active = this.workout?.finished_at ? null : this.workout;
        return { data: { workout: structuredClone(active) }, error: undefined };
      }
      if (path === "/api/workouts") return { data: structuredClone(this.finished), error: undefined };
      if (path === "/api/workouts/{workout_id}") {
        if (this.workout?.id !== init?.params?.path?.workout_id) {
          const message = "Fant ikke økta. Gå tilbake til Trening og prøv igjen.";
          return { error: { error: { code: "workout_not_found", message } } };
        }
        return this.copy();
      }
      throw new Error(`unexpected GET ${path}`);
      },
    );
    apiMock.POST.mockImplementation(
      async (
        path: string,
        init: {
          body: Record<string, string>;
          params?: { path: { workout_id: string; workout_exercise_id?: string } };
        },
      ): Promise<Answer> => {
        if (path === "/api/workouts") {
          this.workout ??= { id: `w-new-${this.next++}`, date: init.body.date, finished_at: null, exercises: [] };
          return this.copy();
        }
        if (path === "/api/workouts/{workout_id}/finish") {
          this.workout!.finished_at = "2026-11-17T18:00:00Z";
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
          this.workout!.exercises.push({
            ...exercise,
            id: `we-${this.next++}`,
            sets: [0, 1, 2].map((position) => this.newSet(position)),
          });
          return this.copy();
        }
        if (path === "/api/workouts/{workout_id}/exercises/{workout_exercise_id}/sets") {
          const weId = init.params!.path.workout_exercise_id;
          const exercise = this.workout!.exercises.find((e) => e.id === weId)!;
          if (exercise.sets.length >= 20) {
            const message = "Du kan ha opptil 20 sett per øvelse.";
            return { error: { error: { code: "set_limit", message } } };
          }
          const body = (init.body ?? {}) as unknown as Partial<WorkoutSet>;
          const set = { ...this.newSet(0), ...body };
          const position = Math.min(body.position ?? exercise.sets.length, exercise.sets.length);
          exercise.sets.splice(position, 0, set);
          exercise.sets.forEach((s, i) => (s.position = i));
          return this.copy();
        }
        throw new Error(`unexpected POST ${path}`);
      },
    );
    apiMock.PATCH.mockImplementation(
      async (
        _path: string,
        init: { params: { path: { set_id: string } }; body: Partial<WorkoutSet> },
      ): Promise<Answer> => {
        this.patches.push(init.body);
        const { exercise, set } = this.findSet(init.params.path.set_id);
        const next = { ...set, ...init.body };
        const fields = [];
        if (next.reps !== null && (next.reps < 1 || next.reps > 100 || !Number.isInteger(next.reps)))
          fields.push({ field: "reps", message: "Skriv repetisjoner som et helt tall fra 1 til 100." });
        if (next.weight_kg !== null && next.weight_kg > 500)
          fields.push({
            field: "weight_kg",
            message: "Skriv kg som et tall fra 0 til 500, med høyst to desimaler.",
          });
        if (next.done && exercise.type === "reps" && next.reps === null)
          fields.push({ field: "reps", message: "Fyll inn repetisjoner." });
        if (next.done && exercise.type === "time" && next.seconds === null)
          fields.push({ field: "seconds", message: "Fyll inn sekunder." });
        if (fields.length) {
          const message = "Forespørselen er ugyldig. Sjekk feltene og prøv igjen.";
          return { error: { error: { code: "validation_error", message, fields } } };
        }
        Object.assign(set, init.body);
        return this.copy();
      },
    );
    apiMock.PUT.mockImplementation(async (_path: string, init: { body: { ids: string[] } }) => {
      const byId = new Map(this.workout!.exercises.map((e) => [e.id, e]));
      this.workout!.exercises = init.body.ids.map((id) => byId.get(id)!);
      return this.copy();
    });
    apiMock.DELETE.mockImplementation(
      async (
        path: string,
        init: {
          params: { path: { workout_id: string; workout_exercise_id: string; set_id: string } };
        },
      ) => {
        if (path === "/api/workouts/{workout_id}") {
          if (this.workout?.id !== init.params.path.workout_id) {
            const message = "Fant ikke økta. Gå tilbake til Trening og prøv igjen.";
            return { error: { error: { code: "workout_not_found", message } } };
          }
          this.deleted.push(init.params.path.workout_id);
          this.workout = null;
          return { data: undefined, error: undefined };
        }
        if (path === "/api/workouts/{workout_id}/sets/{set_id}") {
          const { exercise } = this.findSet(init.params.path.set_id);
          exercise.sets = exercise.sets
            .filter((s) => s.id !== init.params.path.set_id)
            .map((s, i) => ({ ...s, position: i }));
          return this.copy();
        }
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
    server.workout = { id: "w-1", date: "2026-11-17", finished_at: null, exercises: [{ id: "we-1", ...PLANK }] };
    renderWith(<StartWorkout />);
    expect(await screen.findByRole("link", { name: "Fortsett økt · 1 øvelse" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start økt" })).not.toBeInTheDocument();
  });
});

describe("StartWorkout on a chosen date (story 6.3)", () => {
  it("starts the workout on the week strip's date", async () => {
    renderWith(<StartWorkout date="2026-11-16" />);
    const start = await screen.findByRole("button", { name: "Start økt" });
    expect(screen.getByText("Økta lagres på mandag 16. november.")).toBeInTheDocument();
    fireEvent.click(start);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/trening/okt"));
    expect(apiMock.POST).toHaveBeenCalledWith("/api/workouts", { body: { date: "2026-11-16" } });
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
    server.workout = { id: "w-1", date: "2026-11-17", finished_at: null, exercises: [] };
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
    server.workout = { id: "w-old", date: "2026-11-16", finished_at: null, exercises: [] };
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
    server.workout = { id: "w-1", date: "2026-11-16", finished_at: null, exercises: [] };
    renderWith(<AddToWorkout exerciseId={PUSH_UP.exercise_id} />);
    await clickAddWhenReady();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Lagt til i økta."));
    expect(apiMock.POST.mock.calls.map(([path]) => path)).toEqual([
      "/api/workouts/{workout_id}/exercises",
    ]);
  });

  it("shows a disabled Allerede i økta when the exercise is already added", async () => {
    server.workout = { id: "w-1", date: "2026-11-17", finished_at: null, exercises: [{ id: "we-1", ...PUSH_UP }] };
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
      finished_at: null,
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
    server.workout = { id: "w-1", date: "2026-11-17", finished_at: null, exercises: [{ id: "we-1", ...PUSH_UP }] };
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
    server.workout = { id: "w-1", date: "2026-11-17", finished_at: null, exercises: [] };
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

describe("sets (story 5.2)", () => {
  function withSets(...exercises: (typeof PUSH_UP | typeof PLANK)[]): Workout {
    let n = 100;
    return {
      id: "w-1",
      date: "2026-11-17",
      finished_at: null,
      exercises: exercises.map((exercise) => ({
        ...exercise,
        id: `we-${exercise.exercise_id}`,
        sets: [0, 1, 2].map((position) => ({
          id: `s-${n++}`,
          position,
          reps: null,
          weight_kg: null,
          seconds: null,
          done: false,
        })),
      })),
    };
  }

  function input(name: string) {
    return screen.getByRole("textbox", { name }) as HTMLInputElement;
  }

  function type(name: string, text: string) {
    const field = input(name);
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: text } });
    fireEvent.blur(field);
  }

  it("acceptance: 12 in set 1, done on all three, then delete set 3 and Angre", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    await screen.findByRole("list", { name: `Sett for ${PUSH_UP.name}` });
    expect(input(`Repetisjoner, sett 1, ${PUSH_UP.name}`).placeholder).toBe("10");
    expect(input(`Kg, sett 1, ${PUSH_UP.name}`).placeholder).toBe("Kroppsvekt");

    type(`Repetisjoner, sett 1, ${PUSH_UP.name}`, "12");
    for (const n of [1, 2, 3]) {
      fireEvent.click(screen.getByRole("checkbox", { name: `Ferdig, sett ${n}, ${PUSH_UP.name}` }));
    }

    await waitFor(() =>
      expect(server.workout!.exercises[0].sets.map((s) => [s.reps, s.done])).toEqual([
        [12, true],
        [10, true],
        [10, true],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: `Ferdig, sett 3, ${PUSH_UP.name}` })).toBeChecked(),
    );
    expect(["1", "2", "3"].map((n) => input(`Repetisjoner, sett ${n}, ${PUSH_UP.name}`).value)).toEqual([
      "12",
      "10",
      "10",
    ]);
    // Done rows are marked with more than colour: a check icon and stronger text.
    expect(screen.getAllByTestId("set-row")[0].querySelector("svg")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: `Slett sett 3, ${PUSH_UP.name}` }));
    // The row goes at once (optimistic update), without waiting for the server.
    await waitFor(() => expect(screen.getAllByTestId("set-row")).toHaveLength(2));
    expect(await screen.findByTestId("undo-toast")).toHaveTextContent("Sett 3 er slettet.");
    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Angre" }));

    await waitFor(() => expect(screen.getAllByTestId("set-row")).toHaveLength(3));
    expect(server.workout!.exercises[0].sets[2]).toMatchObject({
      position: 2,
      reps: 10,
      done: true,
    });
    expect(input(`Repetisjoner, sett 3, ${PUSH_UP.name}`).value).toBe("10");
    expect(screen.queryByTestId("undo-toast")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Sett 3 er tilbake.");
  });

  it("saves kg with a comma on Enter and shows it with a comma", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    const kg = await screen.findByRole("textbox", { name: `Kg, sett 1, ${PUSH_UP.name}` });

    fireEvent.change(kg, { target: { value: "12,5" } });
    fireEvent.keyDown(kg, { key: "Enter" });

    await waitFor(() => expect(server.workout!.exercises[0].sets[0].weight_kg).toBe(12.5));
    expect(server.patches).toEqual([{ weight_kg: 12.5 }]);
    await waitFor(() => expect(input(`Kg, sett 1, ${PUSH_UP.name}`).value).toBe("12,5"));
  });

  it("does not save an unchanged value", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    await screen.findByRole("textbox", { name: `Kg, sett 1, ${PUSH_UP.name}` });

    type(`Kg, sett 1, ${PUSH_UP.name}`, "");

    expect(apiMock.PATCH).not.toHaveBeenCalled();
  });

  it("shows a field error under the field and keeps the typed value", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    await screen.findByRole("textbox", { name: `Repetisjoner, sett 1, ${PUSH_UP.name}` });

    type(`Repetisjoner, sett 1, ${PUSH_UP.name}`, "101");

    const message = await screen.findByText("Skriv repetisjoner som et helt tall fra 1 til 100.");
    const field = input(`Repetisjoner, sett 1, ${PUSH_UP.name}`);
    expect(field.value).toBe("101");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", message.id);
    expect(server.workout!.exercises[0].sets[0].reps).toBeNull();

    type(`Repetisjoner, sett 1, ${PUSH_UP.name}`, "abc");
    expect(apiMock.PATCH).toHaveBeenCalledTimes(1); // not a number: never sent
    expect(input(`Repetisjoner, sett 1, ${PUSH_UP.name}`).value).toBe("abc");

    type(`Repetisjoner, sett 1, ${PUSH_UP.name}`, "8");
    await waitFor(() => expect(server.workout!.exercises[0].sets[0].reps).toBe(8));
    await waitFor(() =>
      expect(screen.queryByText("Skriv repetisjoner som et helt tall fra 1 til 100.")).toBeNull(),
    );
  });

  it("a time exercise has seconds, and done without seconds asks for them", async () => {
    server.workout = withSets(PLANK);
    renderWith(<WorkoutPage />);
    await screen.findByRole("textbox", { name: `Sekunder, sett 1, ${PLANK.name}` });
    expect(screen.queryByRole("textbox", { name: `Repetisjoner, sett 1, ${PLANK.name}` })).toBeNull();
    expect(screen.queryByRole("textbox", { name: `Kg, sett 1, ${PLANK.name}` })).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: `Ferdig, sett 1, ${PLANK.name}` }));

    expect(await screen.findByText("Fyll inn sekunder.")).toBeInTheDocument();
    expect(server.workout!.exercises[0].sets[0].done).toBe(false);

    type(`Sekunder, sett 1, ${PLANK.name}`, "45");
    await waitFor(() => expect(server.workout!.exercises[0].sets[0].seconds).toBe(45));
  });

  it("Legg til sett adds an empty set last", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);

    fireEvent.click(await screen.findByRole("button", { name: `Legg til sett, ${PUSH_UP.name}` }));

    await waitFor(() => expect(screen.getAllByTestId("set-row")).toHaveLength(4));
    expect(input(`Repetisjoner, sett 4, ${PUSH_UP.name}`).value).toBe("");
  });

  it("disables Legg til sett at 20 sets and says why", async () => {
    server.workout = withSets(PUSH_UP);
    const sets = server.workout.exercises[0].sets;
    for (let position = 3; position < 20; position++) {
      sets.push({ ...sets[0], id: `extra-${position}`, position });
    }
    renderWith(<WorkoutPage />);

    expect(
      await screen.findByRole("button", { name: `Legg til sett, ${PUSH_UP.name}` }),
    ).toBeDisabled();
    expect(screen.getByText("Du kan ha opptil 20 sett per øvelse.")).toBeInTheDocument();
  });

  it("shows one toast at a time and moves focus to the row now in the deleted one's place", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);

    fireEvent.click(await screen.findByRole("button", { name: `Slett sett 1, ${PUSH_UP.name}` }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Slett sett 1, ${PUSH_UP.name}` })).toHaveFocus(),
    );
    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));
    await waitFor(() => expect(apiMock.DELETE).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the delete settle
    fireEvent.click(screen.getByRole("button", { name: `Slett sett 2, ${PUSH_UP.name}` }));

    expect(screen.getAllByTestId("undo-toast")).toHaveLength(1);
    expect(screen.getByTestId("undo-toast")).toHaveTextContent("Sett 2 er slettet.");
    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Slett sett 1, ${PUSH_UP.name}` })).toHaveFocus(),
    );
  });

  it("shows an alert when Angre fails", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Slett sett 2, ${PUSH_UP.name}` }));
    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));
    apiMock.POST.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });

    fireEvent.click(screen.getByRole("button", { name: "Angre" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Vi fikk ikke hentet tilbake sett 2. Legg det til på nytt med Legg til sett.",
    );
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it("after Angre, focus goes to the restored row's first field", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Slett sett 2, ${PUSH_UP.name}` }));
    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Angre" }));

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: `Repetisjoner, sett 2, ${PUSH_UP.name}` }),
      ).toHaveFocus(),
    );
    expect(screen.getAllByTestId("set-row")[1].dataset.setId).toBe(
      server.workout!.exercises[0].sets[1].id,
    );
  });

  it("a double tap on Slett deletes one set", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    const button = await screen.findByRole("button", { name: `Slett sett 1, ${PUSH_UP.name}` });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));
    expect(apiMock.DELETE).toHaveBeenCalledTimes(1);
  });

  it("a failed delete brings the row back and removes the toast", async () => {
    server.workout = withSets(PUSH_UP);
    apiMock.DELETE.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    renderWith(<WorkoutPage />);

    fireEvent.click(await screen.findByRole("button", { name: `Slett sett 3, ${PUSH_UP.name}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(screen.queryByTestId("undo-toast")).toBeNull();
    expect(screen.queryByRole("button", { name: "Angre" })).toBeNull();
    await waitFor(() => expect(screen.getAllByTestId("set-row")).toHaveLength(3));
  });

  it("an earlier save's late answer does not bring a deleted row back", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    await screen.findByRole("list", { name: `Sett for ${PUSH_UP.name}` });

    type(`Repetisjoner, sett 1, ${PUSH_UP.name}`, "8");
    fireEvent.click(screen.getByRole("button", { name: `Slett sett 3, ${PUSH_UP.name}` }));

    await waitFor(() => expect(server.workout!.exercises[0].sets).toHaveLength(2));
    await waitFor(() => expect(input(`Repetisjoner, sett 1, ${PUSH_UP.name}`).value).toBe("8"));
    expect(screen.getAllByTestId("set-row")).toHaveLength(2);
  });

  it("marks a field Ikke lagret when the save fails for another reason", async () => {
    server.workout = withSets(PUSH_UP);
    apiMock.PATCH.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    renderWith(<WorkoutPage />);
    await screen.findByRole("list", { name: `Sett for ${PUSH_UP.name}` });

    type(`Kg, sett 1, ${PUSH_UP.name}`, "20");

    const message = await screen.findByText("Ikke lagret – prøv igjen.");
    expect(message.closest("[aria-live='polite']")).not.toBeNull();
    const field = input(`Kg, sett 1, ${PUSH_UP.name}`);
    expect(field.value).toBe("20");
    expect(field).toHaveAttribute("aria-describedby", message.id);
  });

  it("when Ferdig fails, the checkbox points at the reason", async () => {
    server.workout = withSets(PLANK);
    renderWith(<WorkoutPage />);
    const done = await screen.findByRole("checkbox", { name: `Ferdig, sett 1, ${PLANK.name}` });

    fireEvent.click(done);

    const message = await screen.findByText("Fyll inn sekunder.");
    expect(message.closest("[aria-live='polite']")).not.toBeNull();
    expect(done).toHaveAttribute("aria-invalid", "true");
    expect(done).toHaveAttribute("aria-describedby", message.id);
  });

  it("parses and formats numbers with a decimal comma", () => {
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber(" 12.5 ")).toBe(12.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber("1,2,3")).toBeUndefined();
    expect(formatNumber(12.5)).toBe("12,5");
    expect(formatNumber(null)).toBe("");
  });

  it("puts the set undo toast in a polite live region (story 6.4)", async () => {
    server.workout = withSets(PUSH_UP);
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Slett sett 3, ${PUSH_UP.name}` }));

    expectInPoliteLiveRegion(await screen.findByTestId("undo-toast"));
  });
});

describe("last time (story 5.3)", () => {
  it("formats kg, bodyweight and seconds with a short Norwegian date", () => {
    const lastTime = {
      date: "2026-11-03",
      sets: [
        { reps: 10, weight_kg: 8, seconds: null },
        { reps: 8, weight_kg: 8, seconds: null },
      ],
    };
    expect(lastTimeText(lastTime, "2026-11-17")).toBe("Sist: 8 kg × 10, 8 kg × 8 (3. nov)");
    expect(
      lastTimeText(
        {
          date: "2025-11-03",
          sets: [
            { reps: 10, weight_kg: null, seconds: null },
            { reps: 8, weight_kg: 12.5, seconds: null },
          ],
        },
        "2026-01-05",
      ),
    ).toBe("Sist: 10 rep, 12,5 kg × 8 (3. nov 2025)");
    expect(
      lastTimeText({ date: "2026-05-01", sets: [{ reps: null, weight_kg: null, seconds: 45 }] }, "2026-11-17"),
    ).toBe("Sist: 45 s (1. mai)");
    expect(lastTimeText(null, "2026-11-17")).toBe("Første gang");
  });

  it("formats kg values, seconds with kg, dates, and skips empty values", () => {
    const set = (reps: number | null, weight_kg: number | null, seconds: number | null) => ({
      reps,
      weight_kg,
      seconds,
    });
    expect(lastSetText(set(8, 2.25, null))).toBe("2,25 kg × 8");
    expect(lastSetText(set(5, 100, null))).toBe("100 kg × 5");
    expect(lastSetText(set(10, 0, null))).toBe("0 kg × 10");
    expect(lastSetText(set(null, 10, 45))).toBe("10 kg × 45 s");
    expect(lastSetText(set(null, 8, null))).toBe("8 kg");
    expect(lastSetText(set(null, null, null))).toBeNull();
    expect(
      lastTimeText({ date: "2026-11-03", sets: [set(null, null, null), set(10, null, null)] }, "2026-11-17"),
    ).toBe("Sist: 10 rep (3. nov)");
    expect(lastTimeText({ date: "2026-11-03", sets: [set(null, null, null)] }, "2026-11-17")).toBe(
      "Første gang",
    );
    expect(shortDateText("2026-01-05", "2026-11-17")).toBe("5. jan");
    expect(shortDateText("2026-12-31", "2026-12-31")).toBe("31. des");
    expect(shortDateText("2025-12-31", "2026-01-02")).toBe("31. des 2025");
  });

  it("shows Sist under the exercise name, or Første gang", async () => {
    server.workout = {
      id: "w-1",
      date: "2026-11-17",
      finished_at: null,
      exercises: [
        {
          id: "we-1",
          ...PUSH_UP,
          last_time: {
            date: "2026-11-03",
            sets: [
              { reps: 10, weight_kg: null, seconds: null },
              { reps: 10, weight_kg: null, seconds: null },
            ],
          },
        },
        { id: "we-2", ...SQUAT },
      ],
    };
    renderWith(<WorkoutPage />);

    const lines = await screen.findAllByTestId("last-time");
    expect(lines.map((line) => line.textContent)).toEqual([
      "Sist: 10 rep, 10 rep (3. nov)",
      "Første gang",
    ]);
  });
});

describe("finish, edit or delete (story 5.4)", () => {
  // jsdom has no modal dialog; mimic the parts the browser gives us (open state, close event).
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  });

  beforeEach(() => {
    server.workout = {
      id: "w-1",
      date: "2026-11-03",
      finished_at: null,
      exercises: [{ id: "we-1", ...PUSH_UP, sets: [server.newSet(0), server.newSet(1)] }],
    };
  });

  it("Fullfør økt finishes the workout and goes to I dag", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Fullfør økt" }));

    // Back to I dag for the workout's date (story 6.3).
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/?dato=2026-11-03"));
    expect(apiMock.POST).toHaveBeenCalledWith("/api/workouts/{workout_id}/finish", {
      params: { path: { workout_id: "w-1" } },
    });
    expect(client.getQueryData(["workouts", "active"])).toBeNull();
  });

  it("shows an alert and stays when finishing fails", async () => {
    renderWith(<WorkoutPage />);
    const button = await screen.findByRole("button", { name: "Fullfør økt" });
    apiMock.POST.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt. Prøv igjen om litt.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("a finished workout says Fullført, has no Fullfør or Legg til øvelse, and saves edits", async () => {
    server.workout!.finished_at = "2026-11-03T18:00:00Z";
    renderWith(<WorkoutByIdPage id="w-1" />);

    expect(
      await screen.findByRole("heading", { name: "tirsdag 3. november · Fullført" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fullfør økt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Legg til øvelse" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slett økt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tilbake til Trening" })).toBeInTheDocument();

    const reps = screen.getAllByRole("textbox", { name: /Repetisjoner/ })[0];
    fireEvent.change(reps, { target: { value: "12" } });
    fireEvent.blur(reps);
    await waitFor(() => expect(server.workout!.exercises[0].sets[0].reps).toBe(12));
    // The edit lands in this workout's own cache, never in the active-workout cache.
    expect(client.getQueryData(["workouts", "active"])).toBeUndefined();
  });

  it("Slett økt asks first; Avbryt keeps the workout", async () => {
    renderWith(<WorkoutPage />);
    const trigger = await screen.findByRole("button", { name: "Slett økt" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Slette økta tirsdag 3. november?" });
    expect(dialog).toHaveTextContent("Øvelser og sett i økta blir slettet. Dette kan ikke angres.");
    expect(within(dialog).getByRole("button", { name: "Avbryt" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(server.deleted).toEqual([]);
  });

  it("Esc closes the dialog without deleting", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Slett økt" }));
    const dialog = screen.getByRole("dialog");
    act(() => {
      const cancel = new Event("cancel", { cancelable: true });
      if (dialog.dispatchEvent(cancel)) (dialog as HTMLDialogElement).close();
    });

    expect(dialog).not.toHaveAttribute("open");
    expect(server.deleted).toEqual([]);
  });

  it("Ja, slett deletes the workout and goes to Trening", async () => {
    server.workout!.finished_at = "2026-11-03T18:00:00Z";
    renderWith(<WorkoutByIdPage id="w-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Slett økt" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja, slett" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/trening"));
    expect(server.deleted).toEqual(["w-1"]);
  });

  it("deleting the active workout goes to Trening and clears it", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Slett økt" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja, slett" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/trening"));
    expect(server.deleted).toEqual(["w-1"]);
    expect(client.getQueryData(["workouts", "active"])).toBeNull();
  });

  it("a missing workout says so and links back to Trening", async () => {
    renderWith(<WorkoutByIdPage id="w-gone" />);

    expect(await screen.findByText("Fant ikke økta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tilbake til Trening" })).toHaveAttribute(
      "href",
      "/trening",
    );
    expect(screen.queryByRole("button", { name: "Prøv igjen" })).not.toBeInTheDocument();
  });

  it("the active workout's id redirects to the Økt page", async () => {
    renderWith(<WorkoutByIdPage id="w-1" />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/trening/okt"));
  });

  it("a late write answer after finishing is not stored as the active workout", async () => {
    renderWith(<WorkoutPage />);
    await screen.findByRole("button", { name: "Fullfør økt" });
    server.workout!.finished_at = "2026-11-17T18:00:00Z";
    const reps = screen.getAllByRole("textbox", { name: /Repetisjoner/ })[0];
    fireEvent.change(reps, { target: { value: "12" } });
    fireEvent.blur(reps);

    await waitFor(() => expect(client.getQueryData(["workouts", "detail", "w-1"])).toBeTruthy());
    await waitFor(() => expect(client.getQueryData(["workouts", "active"])).toBeNull());
  });

  it("a failed delete shows an alert in the dialog and stays", async () => {
    renderWith(<WorkoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Slett økt" }));
    apiMock.DELETE.mockResolvedValueOnce({
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ja, slett" }));

    const dialog = screen.getByRole("dialog");
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Noe gikk galt.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("Tidligere økter (story 5.4)", () => {
  const SUMMARY: WorkoutSummary = {
    id: "w-9",
    date: "2026-11-03",
    finished_at: "2026-11-03T18:00:00Z",
    exercise_count: 2,
    done_set_count: 6,
  };

  it("formats a finished workout", () => {
    expect(recentWorkoutText(SUMMARY)).toBe("tirsdag 3. nov · 2 øvelser · 6 sett");
    expect(recentWorkoutText({ ...SUMMARY, exercise_count: 1, done_set_count: 1 })).toBe(
      "tirsdag 3. nov · 1 øvelse · 1 sett",
    );
  });

  it("lists finished workouts as links to their pages", async () => {
    server.finished = [SUMMARY];
    renderWith(<RecentWorkouts />);

    expect(await screen.findByRole("heading", { name: "Tidligere økter" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "tirsdag 3. nov · 2 øvelser · 6 sett" }),
    ).toHaveAttribute("href", "/trening/okt/w-9");
    expect(apiMock.GET).toHaveBeenCalledWith("/api/workouts", { params: { query: { limit: 10 } } });
  });

  it("is hidden when there are none", async () => {
    renderWith(<RecentWorkouts />);
    await waitFor(() => expect(apiMock.GET).toHaveBeenCalledWith("/api/workouts", expect.anything()));
    expect(screen.queryByRole("heading", { name: "Tidligere økter" })).not.toBeInTheDocument();
  });
});

describe("sheet accessibility (story 6.4)", () => {
  beforeAll(installDialogPolyfill);

  beforeEach(() => {
    server.workout = {
      id: "w-1",
      date: "2026-11-03",
      finished_at: null,
      exercises: [{ id: "we-1", ...PUSH_UP, sets: [server.newSet(0), server.newSet(1)] }],
    };
  });

  it("Slett økt: focus moves in, Esc closes, focus back on the opener", async () => {
    renderWith(<WorkoutPage />);

    await expectOpenerSheetFocusCycle(
      await screen.findByRole("button", { name: "Slett økt" }),
      () => screen.getByRole("dialog", { name: "Slette økta tirsdag 3. november?" }),
    );
  });
});
