"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { call } from "@/modules/identity/api";

export type ExerciseListItem = components["schemas"]["ExerciseListItem"];
export type ExerciseDetail = components["schemas"]["ExerciseDetail"];
export type Level = ExerciseListItem["level"];

const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Nybegynner",
  intermediate: "Middels",
  advanced: "Øvet",
};

export function levelLabel(level: Level): string {
  return LEVEL_LABELS[level];
}

/** Path of an exercise's detail page. */
export function exercisePath(id: string): string {
  return `/trening/ovelser/${id}`;
}

/** Reference data that never changes while the app runs (AD-9), so cache it long. */
const REFERENCE_STALE_MS = 60 * 60 * 1000;

/** Every exercise, ordered by primary muscle group by the backend. */
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: () => call(() => api.GET("/api/exercises")),
    staleTime: REFERENCE_STALE_MS,
  });
}

/** One exercise with steps, muscle groups, equipment and video id. */
export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: () =>
      call(() =>
        api.GET("/api/exercises/{exercise_id}", {
          params: { path: { exercise_id: id } },
        }),
      ),
    staleTime: REFERENCE_STALE_MS,
  });
}
