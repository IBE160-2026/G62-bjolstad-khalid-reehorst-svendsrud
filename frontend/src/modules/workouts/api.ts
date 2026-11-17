"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError, call } from "@/modules/identity/api";

export type Workout = components["schemas"]["WorkoutResponse"];
export type WorkoutExercise = components["schemas"]["WorkoutExerciseResponse"];
export type WorkoutSet = components["schemas"]["SetResponse"];
export type SetValues = Pick<WorkoutSet, "reps" | "weight_kg" | "seconds" | "done">;
export type LastTime = components["schemas"]["LastTimeResponse"];
export type LastTimeSet = components["schemas"]["LastTimeSet"];

/** The Økt page: always the workout in progress. */
export const WORKOUT_PATH = "/trening/okt";

/** The server refuses more than this (422). */
export const MAX_WORKOUT_EXERCISES = 20;
/** The server refuses more sets than this per exercise (422). */
export const MAX_SETS = 20;
/** The reps suggested in an empty set (FR23); ticking "Ferdig" on an empty set saves it. */
export const SUGGESTED_REPS = 10;

export const ACTIVE_WORKOUT_KEY = ["workouts", "active"] as const;

export const ALREADY_IN_WORKOUT_CODE = "exercise_already_in_workout";
export const WORKOUT_NOT_FOUND_CODE = "workout_not_found";

/** "tirsdag 17. november" for a YYYY-MM-DD calendar date. */
export function workoutDateText(date: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function exerciseCountText(count: number): string {
  return `${count} ${count === 1 ? "øvelse" : "øvelser"}`;
}

/** The workout in progress, or null when there is none. */
export function useActiveWorkout() {
  return useQuery({
    queryKey: ACTIVE_WORKOUT_KEY,
    queryFn: async () => (await call(() => api.GET("/api/workouts/active"))).workout ?? null,
  });
}

/**
 * Writes on the Økt page (sets, remove, reorder) run one at a time, in the order they were
 * made, so a later answer (the whole workout) never gets overwritten by an earlier one that
 * arrived late, e.g. a blur save of reps followed at once by ticking "Ferdig".
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

/** Sets being deleted: hidden from every stored answer until the delete has settled, so
 * an earlier write's answer that lands later never brings a deleted row back. */
const pendingDeletes = new Set<string>();

/** Every write returns the whole workout; it is the one in progress, so cache it as such. */
function useStoreWorkout() {
  const queryClient = useQueryClient();
  return (workout: Workout) => {
    let shown = workout;
    for (const setId of pendingDeletes) shown = withoutSet(shown, setId);
    queryClient.setQueryData(ACTIVE_WORKOUT_KEY, shown);
  };
}

async function startWorkout(date: string): Promise<Workout> {
  return call(() => api.POST("/api/workouts", { body: { date } }));
}

/** Start a workout for `date` (Europe/Oslo), or get the one already in progress. */
export function useStartWorkout() {
  const store = useStoreWorkout();
  return useMutation({ mutationFn: startWorkout, onSuccess: store });
}

async function addExercise(workoutId: string, exerciseId: string): Promise<Workout> {
  return call(() =>
    api.POST("/api/workouts/{workout_id}/exercises", {
      params: { path: { workout_id: workoutId } },
      body: { exercise_id: exerciseId },
    }),
  );
}

/**
 * "Legg til i økt": starts (or resumes) a workout for `date` when none is known to be in
 * progress, then adds the exercise last. If the known workout is gone (404
 * `workout_not_found`), a workout is started and the add retried once. On any error the active workout is refetched,
 * so "Allerede i økta" or a vanished workout shows without a reload.
 */
export function useAddToWorkout() {
  const queryClient = useQueryClient();
  const store = useStoreWorkout();
  return useMutation({
    mutationFn: async ({
      workoutId,
      exerciseId,
      date,
    }: {
      workoutId: string | null;
      exerciseId: string;
      date: string;
    }) => {
      const id = workoutId ?? (await startWorkout(date)).id;
      try {
        return await addExercise(id, exerciseId);
      } catch (error) {
        // The known workout was finished or deleted elsewhere: start a new one, retry once.
        if (!(error instanceof ApiError) || error.code !== WORKOUT_NOT_FOUND_CODE) throw error;
        return addExercise((await startWorkout(date)).id, exerciseId);
      }
    },
    onSuccess: store,
    onError: () => queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY }),
  });
}

export function useRemoveWorkoutExercise() {
  const queryClient = useQueryClient();
  const store = useStoreWorkout();
  return useMutation({
    mutationFn: ({ workoutId, id }: { workoutId: string; id: string }) =>
      serial(() =>
        call(() =>
          api.DELETE("/api/workouts/{workout_id}/exercises/{workout_exercise_id}", {
            params: { path: { workout_id: workoutId, workout_exercise_id: id } },
          }),
        ),
      ),
    onSuccess: store,
    onError: () => queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY }),
  });
}

export function useReorderWorkoutExercises() {
  const queryClient = useQueryClient();
  const store = useStoreWorkout();
  return useMutation({
    mutationFn: ({ workoutId, ids }: { workoutId: string; ids: string[] }) =>
      serial(() =>
        call(() =>
          api.PUT("/api/workouts/{workout_id}/exercises/order", {
            params: { path: { workout_id: workoutId } },
            body: { ids },
          }),
        ),
      ),
    onSuccess: store,
    onError: () => queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY }),
  });
}

/** `ids` with the item at `index` swapped with its neighbour in `direction`. */
export function moveId(ids: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// --- Sets (story 5.2) ---------------------------------------------------------------------


/** Refetch after an error, except for field errors: the server state did not change. */
function useRefetchOnError() {
  const queryClient = useQueryClient();
  return (error: Error) => {
    if (error instanceof ApiError && error.code === "validation_error") return;
    return queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY });
  };
}

export function useAddSet() {
  const store = useStoreWorkout();
  const onError = useRefetchOnError();
  return useMutation({
    mutationFn: ({
      workoutId,
      workoutExerciseId,
      body,
    }: {
      workoutId: string;
      workoutExerciseId: string;
      /** Values and 0-based position, for "Angre"; left out for a new empty set last. */
      body?: Partial<SetValues> & { position?: number };
    }) =>
      serial(() =>
        call(() =>
          api.POST("/api/workouts/{workout_id}/exercises/{workout_exercise_id}/sets", {
            params: { path: { workout_id: workoutId, workout_exercise_id: workoutExerciseId } },
            body: { done: false, ...body },
          }),
        ),
      ),
    onSuccess: store,
    onError,
  });
}

export function useUpdateSet() {
  const store = useStoreWorkout();
  const onError = useRefetchOnError();
  return useMutation({
    mutationFn: ({
      workoutId,
      setId,
      body,
    }: {
      workoutId: string;
      setId: string;
      body: Partial<SetValues>;
    }) =>
      serial(() =>
        call(() =>
          api.PATCH("/api/workouts/{workout_id}/sets/{set_id}", {
            params: { path: { workout_id: workoutId, set_id: setId } },
            body,
          }),
        ),
      ),
    onSuccess: store,
    onError,
  });
}

/** The workout without one set, the others renumbered: shown at once while deleting. */
export function withoutSet(workout: Workout, setId: string): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets
        .filter((set) => set.id !== setId)
        .map((set, position) => ({ ...set, position })),
    })),
  };
}

/** Delete is immediate: the row disappears before the server answers (UX-DR11). */
export function useDeleteSet() {
  const queryClient = useQueryClient();
  const store = useStoreWorkout();
  return useMutation({
    mutationFn: ({ workoutId, setId }: { workoutId: string; setId: string }) =>
      serial(() =>
        call(() =>
          api.DELETE("/api/workouts/{workout_id}/sets/{set_id}", {
            params: { path: { workout_id: workoutId, set_id: setId } },
          }),
        ),
      ),
    onMutate: async ({ setId }) => {
      pendingDeletes.add(setId);
      // A refetch in flight must not bring the row back either.
      await queryClient.cancelQueries({ queryKey: ACTIVE_WORKOUT_KEY });
      const current = queryClient.getQueryData<Workout | null>(ACTIVE_WORKOUT_KEY);
      if (current) queryClient.setQueryData(ACTIVE_WORKOUT_KEY, withoutSet(current, setId));
    },
    onSuccess: store,
    onError: (_error, { setId }) => {
      pendingDeletes.delete(setId);
      return queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY });
    },
    onSettled: (_data, _error, { setId }) => {
      pendingDeletes.delete(setId);
    },
  });
}

/** "12,5" or "12.5" → 12.5; empty → null; anything else → undefined (not a number). */
export function parseNumber(text: string): number | null | undefined {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  if (!/^-?\d+(\.\d*)?$|^-?\.\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

/** 12.5 → "12,5" (Norwegian decimal comma); null → "". */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

// --- Last time (story 5.3) ----------------------------------------------------------------

// prettier-ignore
const SHORT_MONTHS = [
  "jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des",
];

/** "8 kg × 10", "10 rep" (no kg = bodyweight), "12,5 kg × 8", "45 s", "10 kg × 45 s" or
 * "8 kg" (kg only); null when the set has no value at all. */
export function lastSetText(set: LastTimeSet): string | null {
  const kg = set.weight_kg !== null ? `${formatNumber(set.weight_kg)} kg` : null;
  const amount =
    set.seconds !== null ? `${set.seconds} s` : set.reps !== null ? `${set.reps}` : null;
  if (amount === null) return kg;
  if (kg === null) return set.seconds !== null ? amount : `${amount} rep`;
  return `${kg} × ${amount}`;
}

/** "3. nov" for a YYYY-MM-DD date; "3. nov 2025" when the year differs from `workoutDate`'s. */
export function shortDateText(date: string, workoutDate: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const text = `${day}. ${SHORT_MONTHS[month - 1]}`;
  return date.slice(0, 4) === workoutDate.slice(0, 4) ? text : `${text} ${year}`;
}

/** "Sist: 8 kg × 10, 8 kg × 8 (3. nov)", or "Første gang" when there is nothing to show. */
export function lastTimeText(lastTime: LastTime | null | undefined, workoutDate: string): string {
  const sets = (lastTime?.sets ?? [])
    .map(lastSetText)
    .filter((text): text is string => text !== null)
    .join(", ");
  if (!lastTime || sets === "") return "Første gang";
  return `Sist: ${sets} (${shortDateText(lastTime.date, workoutDate)})`;
}
