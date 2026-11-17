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

export type MuscleGroupSlug = components["schemas"]["MuscleGroupSlug"];

/** Optional suggestion filters (story 4.5); at most one muscle group and one level. */
export type SuggestionFilters = { muscleGroup: MuscleGroupSlug | null; level: Level | null };

export const NO_FILTERS: SuggestionFilters = { muscleGroup: null, level: null };

/** The six muscle groups as shown on Trening, with their Norwegian names. */
export const MUSCLE_GROUPS: readonly { slug: MuscleGroupSlug; name: string }[] = [
  { slug: "skuldre", name: "Skuldre" },
  { slug: "bryst", name: "Bryst" },
  { slug: "mage-kjerne", name: "Mage/kjerne" },
  { slug: "armer", name: "Armer" },
  { slug: "ben", name: "Ben" },
  { slug: "rygg", name: "Rygg" },
];

export function muscleGroupName(slug: MuscleGroupSlug): string {
  return MUSCLE_GROUPS.find((group) => group.slug === slug)?.name ?? slug;
}

/** The labels of the active filters, muscle group first ("Bryst", "Nybegynner"). */
export function filterLabels(filters: SuggestionFilters): string[] {
  const labels: string[] = [];
  if (filters.muscleGroup) labels.push(muscleGroupName(filters.muscleGroup));
  if (filters.level) labels.push(levelLabel(filters.level));
  return labels;
}

/** Suggestions plus the filters they were asked for, so a list kept while the next
 * one loads is described by its own filters. */
export type SuggestionsResult = Suggestions & { filters: SuggestionFilters };

/**
 * Exercises that fit the profile and the optional filters, ordered by level by the
 * backend (AD-5: the rule, filters included, lives only there). Keyed under the profiles
 * key, so editing a profile refreshes these too. The previous list stays while a newly
 * chosen profile or filter loads. If the profile was deleted elsewhere (404), the profile
 * list is refetched so the choice falls back to the first.
 */
export function useSuggestions(
  profileId: string | undefined,
  filters: SuggestionFilters = NO_FILTERS,
) {
  const refetchProfilesOnNotFound = useRefetchProfilesOnNotFound();
  const { muscleGroup, level } = filters;
  return useQuery({
    queryKey: [...EQUIPMENT_PROFILES_KEY, "suggestions", profileId, muscleGroup, level],
    queryFn: async (): Promise<SuggestionsResult> => {
      const data = await refetchProfilesOnNotFound(() =>
        call(() =>
          api.GET("/api/exercises/suggestions", {
            params: {
              query: {
                profile_id: profileId as string,
                ...(muscleGroup ? { muscle_group: muscleGroup } : {}),
                ...(level ? { level } : {}),
              },
            },
          }),
        ),
      );
      return { ...data, filters: { muscleGroup, level } };
    },
    enabled: profileId !== undefined,
    placeholderData: keepPreviousData,
  });
}

/** Runs a profile-scoped request; on 404 `equipment_profile_not_found` (the profile was
 * deleted elsewhere) the profile list is refetched, so the choice falls back to the first. */
function useRefetchProfilesOnNotFound() {
  const queryClient = useQueryClient();
  return async <T,>(request: () => Promise<T>): Promise<T> => {
    try {
      return await request();
    } catch (error) {
      if (error instanceof ApiError && error.code === PROFILE_NOT_FOUND_CODE) {
        // Exact: only the list, not the failing query again.
        void queryClient.invalidateQueries({ queryKey: EQUIPMENT_PROFILES_KEY, exact: true });
      }
      throw error;
    }
  };
}

// --- Search by name (story 4.4) ---

export type ExerciseSearchItem = components["schemas"]["ExerciseSearchItem"];

/** The server answers 422 outside 2–50 characters, so nothing is asked for then. */
export const EXERCISE_SEARCH_MIN_LENGTH = 2;
export const EXERCISE_SEARCH_MAX_LENGTH = 50;

/**
 * Every exercise whose name contains `query`, each marked with whether it fits the
 * profile (the fit rule lives only in the backend, AD-5). Keyed under the profiles key,
 * so editing a profile refreshes the marks; the previous results stay while the next load.
 */
/** Length in characters as the server counts them (an emoji is one, not two). */
export function searchLength(query: string): number {
  return [...query.trim()].length;
}

export function useExerciseSearch(profileId: string | undefined, query: string) {
  const q = query.trim();
  const length = searchLength(q);
  const refetchProfilesOnNotFound = useRefetchProfilesOnNotFound();
  return useQuery({
    // Keyed on the query exactly as sent.
    queryKey: [...EQUIPMENT_PROFILES_KEY, "search", profileId, q],
    queryFn: () =>
      refetchProfilesOnNotFound(() =>
        call(() =>
          api.GET("/api/exercises/search", {
            params: { query: { profile_id: profileId as string, q } },
          }),
        ),
      ),
    enabled:
      profileId !== undefined &&
      length >= EXERCISE_SEARCH_MIN_LENGTH &&
      length <= EXERCISE_SEARCH_MAX_LENGTH,
    placeholderData: keepPreviousData,
  });
}
