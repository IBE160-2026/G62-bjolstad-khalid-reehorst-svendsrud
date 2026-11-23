"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

import {
  ACCOUNT_DELETED_PATH,
  LOGIN_PATH,
  PASSWORD_CHANGED_PATH,
  PROFILE_SETUP_PATH,
} from "./routes";
import type { RegisterValues } from "./validation";

type ErrorBody = components["schemas"]["ErrorBody"];
type FieldError = components["schemas"]["FieldError"];

export const ME_QUERY_KEY = ["me"] as const;
/**
 * Set by a login that reactivated a deactivated account (story 1.8); the first signed-in
 * page reads it once to say "Velkommen tilbake!" and removes it.
 */
export const REACTIVATED_QUERY_KEY = ["reactivated"] as const;

export const NETWORK_ERROR_MESSAGE = "Vi fikk ikke kontakt med serveren. Prøv igjen.";
export const DEACTIVATE_UNAUTHORIZED_MESSAGE =
  "Du må logge inn på nytt for å deaktivere kontoen.";

/** An error envelope from the API; the UI shows `message` and branches only on `code`. */
export class ApiError extends Error {
  readonly code: string;
  readonly fields: FieldError[];

  constructor(code: string, message: string, fields: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
  }
}

// openapi-fetch returns a string when the body is not JSON (e.g. a proxy error page).
function toApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "error" in error) {
    const body = (error as { error: Partial<ErrorBody> }).error;
    if (body && typeof body.code === "string" && typeof body.message === "string") {
      return new ApiError(body.code, body.message, body.fields ?? []);
    }
  }
  return new ApiError("network_error", NETWORK_ERROR_MESSAGE);
}

/** Run an openapi-fetch call and turn every failure into an `ApiError`. */
export async function call<T>(request: () => Promise<{ data?: T; error?: unknown }>): Promise<T> {
  let result;
  try {
    result = await request();
  } catch {
    throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
  }
  if (result.error !== undefined || result.data === undefined) throw toApiError(result.error);
  return result.data;
}

/** Like `call`, for endpoints that answer 204 with no body. */
export async function callNoContent(request: () => Promise<{ error?: unknown }>): Promise<void> {
  let result;
  try {
    result = await request();
  } catch {
    throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
  }
  if (result.error !== undefined) throw toApiError(result.error);
}

/**
 * A new session: drop everything cached for the previous user, then store the new one.
 * `reactivated` sets the welcome-back flag before the user, so it is there when the
 * signed-in page renders.
 */
function useStartSession() {
  const queryClient = useQueryClient();
  return (user: components["schemas"]["UserResponse"], reactivated = false) => {
    queryClient.clear();
    if (reactivated) queryClient.setQueryData(REACTIVATED_QUERY_KEY, true);
    queryClient.setQueryData(ME_QUERY_KEY, user);
  };
}

export function useRegister() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (values: RegisterValues) =>
      call(() => api.POST("/api/identity/register", { body: values })),
    // Pass only the user: a new account is never "reactivated" (the mutation's second
    // argument would otherwise land in startSession's `reactivated` parameter).
    onSuccess: (user) => startSession(user),
  });
}

export function useLogin() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (values: RegisterValues) =>
      call(() => api.POST("/api/identity/login", { body: values })),
    onSuccess: ({ reactivated, ...user }) => startSession(user, reactivated),
  });
}

/**
 * Ask for a reset link (story 1.7). The backend answers 204 whether or not the e-mail has
 * an account, so success says nothing about the account.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      callNoContent(() => api.POST("/api/identity/password-reset", { body: { email } })),
  });
}

/**
 * Set a new password from a reset link (story 1.7). Every session is ended on the server and
 * nobody is logged in, so drop the cache and show the login page with a status line.
 */
export function useConfirmPasswordReset() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      callNoContent(() => api.POST("/api/identity/password-reset/confirm", { body })),
    onSuccess: () => {
      router.replace(PASSWORD_CHANGED_PATH);
      queryClient.clear();
    },
  });
}

/** The logged-in user as the backend sees it; a 401 means the session is gone. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => call(() => api.GET("/api/identity/me")),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === "unauthorized") && failureCount < 2,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      let result;
      try {
        result = await api.POST("/api/identity/logout");
      } catch {
        throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
      }
      if (result.error === undefined) return;
      const error = toApiError(result.error);
      // Already logged out on the server: the goal is reached.
      if (error.code !== "unauthorized") throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace(LOGIN_PATH);
    },
  });
}

/**
 * Record consent to storing health data, then continue to profile setup (stories 1.5, 2.1).
 * A user who just consented cannot have a profile yet: it requires consent.
 */
export function useGiveConsent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => call(() => api.POST("/api/identity/consent")),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
      router.replace(PROFILE_SETUP_PATH);
    },
  });
}

type UserResponse = components["schemas"]["UserResponse"];

/**
 * Close the first-run introduction for good (story 2.3). The `["me"]` cache is updated at
 * once, so the dialog does not wait for the server; a failed request is not rolled back.
 */
export function useDismissIntro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call(() => api.POST("/api/identity/intro/dismiss")),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
      queryClient.setQueryData<UserResponse>(ME_QUERY_KEY, (user) =>
        user
          ? { ...user, intro_dismissed_at: user.intro_dismissed_at ?? new Date().toISOString() }
          : user,
      );
    },
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

/** Delete the account (soft delete, every session ended), then show the login page (story 1.6). */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      let result;
      try {
        result = await api.DELETE("/api/identity/me");
      } catch {
        throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
      }
      if (result.error === undefined) return;
      const error = toApiError(result.error);
      // Already deleted (another tab) or the session is gone: nothing left to delete here.
      if (error.code !== "unauthorized") throw error;
    },
    onSuccess: () => {
      // Navigate first, so a still-mounted SessionGuard refetching /me cannot win the
      // race to a plain /logg-inn without the status line.
      router.replace(ACCOUNT_DELETED_PATH);
      queryClient.clear();
    },
  });
}

/**
 * Deactivate the account (every session ended, no data deleted), then show the login page
 * (story 1.8). Logging in again with the right password reactivates it.
 */
export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      let result;
      try {
        result = await api.POST("/api/identity/deactivate");
      } catch {
        throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
      }
      if (result.error === undefined) return;
      const error = toApiError(result.error);
      // The session is gone, so nothing was deactivated: say so instead of leaving.
      if (error.code === "unauthorized") {
        throw new ApiError("unauthorized", DEACTIVATE_UNAUTHORIZED_MESSAGE);
      }
      throw error;
    },
    onSuccess: () => {
      // Navigate first, like account deletion, so SessionGuard cannot race the redirect.
      router.replace(LOGIN_PATH);
      queryClient.clear();
    },
  });
}
