"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError, call } from "@/modules/identity/api";

export type Workout = components["schemas"]["WorkoutResponse"];
export type WorkoutExercise = components["schemas"]["WorkoutExerciseResponse"];

/** The Økt page: always the workout in progress. */
export const WORKOUT_PATH = "/trening/okt";

/** The server refuses more than this (422). */
export const MAX_WORKOUT_EXERCISES = 20;

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

/** Every write returns the whole workout; it is the one in progress, so cache it as such. */
function useStoreWorkout() {
  const queryClient = useQueryClient();
  return (workout: Workout) => queryClient.setQueryData(ACTIVE_WORKOUT_KEY, workout);
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
      call(() =>
        api.DELETE("/api/workouts/{workout_id}/exercises/{workout_exercise_id}", {
          params: { path: { workout_id: workoutId, workout_exercise_id: id } },
        }),
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
      call(() =>
        api.PUT("/api/workouts/{workout_id}/exercises/order", {
          params: { path: { workout_id: workoutId } },
          body: { ids },
        }),
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
