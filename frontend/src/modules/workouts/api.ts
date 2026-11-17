"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api/client";
import { datedHref } from "@/lib/selected-date";
import { osloToday } from "@/modules/food/meals";
import type { components } from "@/lib/api/schema";
import { ApiError, call, callNoContent } from "@/modules/identity/api";
import {
  OVERVIEW_KEY,
  OVERVIEW_WEEK_KEY,
  overviewKey,
  overviewWeekKeyFor,
} from "@/modules/overview/api";

export type Workout = components["schemas"]["WorkoutResponse"];
export type WorkoutExercise = components["schemas"]["WorkoutExerciseResponse"];
export type WorkoutSet = components["schemas"]["SetResponse"];
export type SetValues = Pick<WorkoutSet, "reps" | "weight_kg" | "seconds" | "done">;
export type LastTime = components["schemas"]["LastTimeResponse"];
export type LastTimeSet = components["schemas"]["LastTimeSet"];
export type WorkoutSummary = components["schemas"]["WorkoutSummary"];

/** The Økt page: always the workout in progress. */
export const WORKOUT_PATH = "/trening/okt";

/** One of the user's workouts, finished or not (story 5.4). */
export function workoutPath(id: string): string {
  return `${WORKOUT_PATH}/${id}`;
}

/** The server refuses more than this (422). */
export const MAX_WORKOUT_EXERCISES = 20;
/** The server refuses more sets than this per exercise (422). */
export const MAX_SETS = 20;
/** The reps suggested in an empty set (FR23); ticking "Ferdig" on an empty set saves it. */
export const SUGGESTED_REPS = 10;

export const ACTIVE_WORKOUT_KEY = ["workouts", "active"] as const;
/** "Tidligere økter" on Trening (story 5.4). */
export const FINISHED_WORKOUTS_KEY = ["workouts", "finished"] as const;
/** How many finished workouts Trening lists. */
export const RECENT_WORKOUTS_LIMIT = 10;

/** One workout by id, for `/trening/okt/{id}`. Its own key, so it never replaces the
 * active-workout cache. */
export function workoutKey(id: string) {
  return ["workouts", "detail", id] as const;
}

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

/** Every write returns the whole workout; cache it under the key of the page that made
 * the write (the active workout by default). A finished workout is never stored as the
 * active one (a late answer after "Fullfør økt"); its change may alter the counts in
 * "Tidligere økter" and "Sist" on the active workout, so both are refetched. */
function useStoreWorkout(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const queryClient = useQueryClient();
  return (workout: Workout) => {
    // I dag and the week strip show the date's done sets (AD-15).
    void queryClient.invalidateQueries({ queryKey: overviewKey(workout.date) });
    void queryClient.invalidateQueries({ queryKey: overviewWeekKeyFor(workout.date) });
    let shown = workout;
    for (const setId of pendingDeletes) shown = withoutSet(shown, setId);
    if (!workout.finished_at) {
      queryClient.setQueryData(queryKey, shown);
      return;
    }
    const isActiveKey = JSON.stringify(queryKey) === JSON.stringify(ACTIVE_WORKOUT_KEY);
    queryClient.setQueryData(isActiveKey ? workoutKey(workout.id) : queryKey, shown);
    void queryClient.invalidateQueries({ queryKey: FINISHED_WORKOUTS_KEY });
    void queryClient.invalidateQueries({ queryKey: ACTIVE_WORKOUT_KEY });
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

export function useRemoveWorkoutExercise(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const queryClient = useQueryClient();
  const store = useStoreWorkout(queryKey);
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
    onError: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useReorderWorkoutExercises(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const queryClient = useQueryClient();
  const store = useStoreWorkout(queryKey);
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
    onError: () => queryClient.invalidateQueries({ queryKey }),
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
function useRefetchOnError(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  return (error: Error) => {
    if (error instanceof ApiError && error.code === "validation_error") return;
    return queryClient.invalidateQueries({ queryKey });
  };
}

export function useAddSet(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const store = useStoreWorkout(queryKey);
  const onError = useRefetchOnError(queryKey);
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

export function useUpdateSet(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const store = useStoreWorkout(queryKey);
  const onError = useRefetchOnError(queryKey);
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
export function useDeleteSet(queryKey: QueryKey = ACTIVE_WORKOUT_KEY) {
  const queryClient = useQueryClient();
  const store = useStoreWorkout(queryKey);
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
      await queryClient.cancelQueries({ queryKey });
      const current = queryClient.getQueryData<Workout | null>(queryKey);
      if (current) queryClient.setQueryData(queryKey, withoutSet(current, setId));
    },
    onSuccess: store,
    onError: (_error, { setId }) => {
      pendingDeletes.delete(setId);
      return queryClient.invalidateQueries({ queryKey });
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

// --- Finish, list and delete (story 5.4) --------------------------------------------------

/** One workout by id, finished or not; 404 `workout_not_found` for a missing one. */
export function useWorkout(id: string) {
  return useQuery({
    queryKey: workoutKey(id),
    // A missing workout stays missing; show it at once instead of retrying.
    retry: (count, error) =>
      !(error instanceof ApiError && error.code === WORKOUT_NOT_FOUND_CODE) && count < 3,
    queryFn: () =>
      call(() => api.GET("/api/workouts/{workout_id}", { params: { path: { workout_id: id } } })),
  });
}

/** The latest finished workouts, newest first, for "Tidligere økter". */
export function useFinishedWorkouts() {
  return useQuery({
    queryKey: FINISHED_WORKOUTS_KEY,
    queryFn: () =>
      call(() =>
        api.GET("/api/workouts", { params: { query: { limit: RECENT_WORKOUTS_LIMIT } } }),
      ),
  });
}

/** "Fullfør økt". Runs after any save still in the queue, so the last blur save lands first.
 * Goes to I dag before the active cache is cleared, since clearing it unmounts the page. */
export function useFinishWorkout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (workoutId: string) =>
      serial(() =>
        call(() =>
          api.POST("/api/workouts/{workout_id}/finish", {
            params: { path: { workout_id: workoutId } },
          }),
        ),
      ),
    onSuccess: (workout) => {
      // Back to I dag for the workout's date (story 6.3).
      router.push(datedHref("/", workout.date, osloToday()));
      // Only the unfinished workout can be finished, so none is in progress now.
      queryClient.setQueryData(ACTIVE_WORKOUT_KEY, null);
      queryClient.setQueryData(workoutKey(workout.id), workout);
      void queryClient.invalidateQueries({ queryKey: overviewKey(workout.date) });
      void queryClient.invalidateQueries({ queryKey: overviewWeekKeyFor(workout.date) });
      return queryClient.invalidateQueries({ queryKey: FINISHED_WORKOUTS_KEY });
    },
  });
}

/** "Slett økt" (after the confirmation dialog): the workout, its exercises and sets. Goes
 * to Trening before the caches are cleared, since clearing them unmounts the page. */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (workoutId: string) =>
      serial(() =>
        callNoContent(() =>
          api.DELETE("/api/workouts/{workout_id}", {
            params: { path: { workout_id: workoutId } },
          }),
        ),
      ),
    onSuccess: (_data, workoutId) => {
      router.push("/trening");
      queryClient.removeQueries({ queryKey: workoutKey(workoutId) });
      const active = queryClient.getQueryData<Workout | null>(ACTIVE_WORKOUT_KEY);
      if (active?.id === workoutId) queryClient.setQueryData(ACTIVE_WORKOUT_KEY, null);
      // Only the id is known here, so every date's overview is refetched.
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_WEEK_KEY });
      return queryClient.invalidateQueries({ queryKey: FINISHED_WORKOUTS_KEY });
    },
  });
}

/** "tirsdag 3. nov · 2 øvelser · 6 sett" (done sets) for "Tidligere økter". */
export function recentWorkoutText(workout: WorkoutSummary): string {
  const weekday = new Intl.DateTimeFormat("nb-NO", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${workout.date}T00:00:00Z`),
  );
  return [
    `${weekday} ${shortDateText(workout.date, workout.date)}`,
    exerciseCountText(workout.exercise_count),
    `${workout.done_set_count} sett`,
  ].join(" · ");
}
