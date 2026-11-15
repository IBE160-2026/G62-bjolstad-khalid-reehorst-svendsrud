"use client";

import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

import type { RegisterValues } from "./validation";

type ErrorBody = components["schemas"]["ErrorBody"];
type FieldError = components["schemas"]["FieldError"];

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

export function useRegister() {
  return useMutation({
    mutationFn: async (values: RegisterValues) => {
      let result;
      try {
        result = await api.POST("/api/identity/register", { body: values });
      } catch {
        throw new ApiError("network_error", NETWORK_ERROR_MESSAGE);
      }
      if (result.error !== undefined || !result.data) throw toApiError(result.error);
      return result.data;
    },
  });
}
