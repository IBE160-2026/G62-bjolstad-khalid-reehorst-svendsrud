"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { ApiError, call } from "@/modules/identity/api";
import { OVERVIEW_KEY } from "@/modules/overview/api";

export type Profile = components["schemas"]["ProfileResponse"];
export type ProfileRequest = components["schemas"]["ProfileRequest"];

export const PROFILE_QUERY_KEY = ["profile"] as const;
export const PROFILE_NOT_FOUND_CODE = "profile_not_found";

/** Answers that will not change by asking again. */
const FINAL_CODES = new Set([PROFILE_NOT_FOUND_CODE, "consent_required", "unauthorized"]);

/** The user's profile with the target the backend computed; 404 `profile_not_found` before setup. */
export function useProfile({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => call(() => api.GET("/api/profile")),
    enabled,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && FINAL_CODES.has(error.code)) && failureCount < 2,
  });
}

/** True when the backend said the user has no profile yet. */
export function isProfileMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === PROFILE_NOT_FOUND_CODE;
}

/** Save the profile; the backend computes and stores the target and returns it. */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileRequest) => call(() => api.PUT("/api/profile", { body })),
    onSuccess: async (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      // The day note shows the stored target.
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
