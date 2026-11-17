"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError, call, callNoContent } from "@/modules/identity/api";

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

// --- Suggestions (story 4.3) ---

export type Suggestions = components["schemas"]["SuggestionsResponse"];

/** Remembers the profile last chosen on Trening, per browser and per user. */
export const TRENING_PROFILE_STORAGE_KEY = "pf-trening-profile";

export function profileStorageKey(userId: string): string {
  return `${TRENING_PROFILE_STORAGE_KEY}:${userId}`;
}

/** The user's stored profile id, or null when missing or storage is blocked. */
export function readStoredProfileId(userId: string): string | null {
  try {
    return window.localStorage.getItem(profileStorageKey(userId));
  } catch {
    return null;
  }
}

/** Remember the user's chosen profile; silently does nothing when storage is blocked. */
export function storeProfileId(userId: string, id: string): void {
  try {
    window.localStorage.setItem(profileStorageKey(userId), id);
  } catch {
    // Storage blocked: the first profile is the default next time.
  }
}

const PROFILE_NOT_FOUND_CODE = "equipment_profile_not_found";

/**
 * Exercises that fit the profile, ordered by level by the backend (AD-5: the rule lives
 * only there). Keyed under the profiles key, so editing a profile refreshes these too.
 * The previous list stays while a newly chosen profile loads. If the profile was deleted
 * elsewhere (404), the profile list is refetched so the choice falls back to the first.
 */
export function useSuggestions(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...EQUIPMENT_PROFILES_KEY, "suggestions", profileId],
    queryFn: async () => {
      try {
        return await call(() =>
          api.GET("/api/exercises/suggestions", {
            params: { query: { profile_id: profileId as string } },
          }),
        );
      } catch (error) {
        if (error instanceof ApiError && error.code === PROFILE_NOT_FOUND_CODE) {
          // Exact: only the list, not this failing query again.
          void queryClient.invalidateQueries({ queryKey: EQUIPMENT_PROFILES_KEY, exact: true });
        }
        throw error;
      }
    },
    enabled: profileId !== undefined,
    placeholderData: keepPreviousData,
  });
}
