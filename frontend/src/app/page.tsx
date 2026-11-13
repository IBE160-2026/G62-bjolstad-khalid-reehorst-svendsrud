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

export default function Home() {
  const health = useHealth();

  let status = "Sjekker backend …";
  if (health.isSuccess) status = `Backend: ${health.data.status}`;
  if (health.isError) status = `Backend: utilgjengelig (${health.error.message})`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold">Prompt Force</h1>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );
}
