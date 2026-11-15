"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

import { HOME_PATH, LOGIN_PATH } from "./routes";
import type { RegisterValues } from "./validation";

type ErrorBody = components["schemas"]["ErrorBody"];
type FieldError = components["schemas"]["FieldError"];

export const ME_QUERY_KEY = ["me"] as const;

export const NETWORK_ERROR_MESSAGE = "Vi fikk ikke kontakt med serveren. Prøv igjen.";

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
async function call<T>(request: () => Promise<{ data?: T; error?: unknown }>): Promise<T> {
  let result;
  try {
    result = await request();
  } catch {
    throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
  }
  if (result.error !== undefined || result.data === undefined) throw toApiError(result.error);
  return result.data;
}

/** A new session: drop everything cached for the previous user, then store the new one. */
function useStartSession() {
  const queryClient = useQueryClient();
  return (user: components["schemas"]["UserResponse"]) => {
    queryClient.clear();
    queryClient.setQueryData(ME_QUERY_KEY, user);
  };
}

export function useRegister() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (values: RegisterValues) =>
      call(() => api.POST("/api/identity/register", { body: values })),
    onSuccess: startSession,
  });
}

export function useLogin() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (values: RegisterValues) =>
      call(() => api.POST("/api/identity/login", { body: values })),
    onSuccess: startSession,
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

/** Record consent to storing health data, then continue into the app (story 1.5). */
export function useGiveConsent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => call(() => api.POST("/api/identity/consent")),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
      router.replace(HOME_PATH);
    },
  });
}
