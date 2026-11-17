"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { call, callNoContent } from "@/modules/identity/api";

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

// --- Equipment Profiles ("Utstyr", story 4.2) ---

export type Equipment = components["schemas"]["EquipmentResponse"];
export type EquipmentProfile = components["schemas"]["EquipmentProfileResponse"];
export type EquipmentProfileCreate = components["schemas"]["EquipmentProfileCreate"];
export type EquipmentProfileUpdate = components["schemas"]["EquipmentProfileUpdate"];

/** Always in every profile; the server adds it whatever the client sends. */
export const BODYWEIGHT_SLUG = "kroppsvekt";

/** The server refuses more than this (422 `equipment_profile_limit`). */
export const MAX_EQUIPMENT_PROFILES = 10;

export const EQUIPMENT_PROFILES_KEY = ["equipment-profiles"] as const;

/** The nine equipment types in seed order (reference data). */
export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: () => call(() => api.GET("/api/exercises/equipment")),
    staleTime: REFERENCE_STALE_MS,
  });
}

/** The user's Equipment Profiles in creation order. */
export function useEquipmentProfiles() {
  return useQuery({
    queryKey: EQUIPMENT_PROFILES_KEY,
    queryFn: () => call(() => api.GET("/api/exercises/equipment-profiles")),
  });
}

function useInvalidateProfiles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EQUIPMENT_PROFILES_KEY });
}

export function useCreateEquipmentProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (body: EquipmentProfileCreate) =>
      call(() => api.POST("/api/exercises/equipment-profiles", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateEquipmentProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EquipmentProfileUpdate }) =>
      call(() =>
        api.PATCH("/api/exercises/equipment-profiles/{profile_id}", {
          params: { path: { profile_id: id } },
          body,
        }),
      ),
    // On settle, not success: a 404 (deleted elsewhere) must drop the stale row too.
    onSettled: invalidate,
  });
}

export function useDeleteEquipmentProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (id: string) =>
      callNoContent(() =>
        api.DELETE("/api/exercises/equipment-profiles/{profile_id}", {
          params: { path: { profile_id: id } },
        }),
      ),
    // On settle, not success: a 404 (deleted elsewhere) must drop the stale row too.
    onSettled: invalidate,
  });
}
