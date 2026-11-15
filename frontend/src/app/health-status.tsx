"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

const FALLBACK_MESSAGE = "Fikk ikke kontakt med backend.";

// openapi-fetch returns a string error when the body is not JSON (e.g. proxy 500 text).
function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const inner = (error as { error: unknown }).error;
    if (typeof inner === "object" && inner !== null && "message" in inner) {
      const message = (inner as { message: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  }
  return FALLBACK_MESSAGE;
}

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/health");
      if (error !== undefined || !data) {
        throw new Error(errorMessage(error));
      }
      return data;
    },
  });
}

/** Backend health line; story 1.1 verification looks for "Backend: ok". */
export function HealthStatus() {
  const health = useHealth();

  let status = "Sjekker backend …";
  if (health.isSuccess) status = `Backend: ${health.data.status}`;
  if (health.isError) status = `Backend: utilgjengelig (${health.error.message})`;

  return (
    <p role="status" aria-live="polite" className="text-small text-muted-foreground">
      {status}
    </p>
  );
}
