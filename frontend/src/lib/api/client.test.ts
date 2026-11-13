import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";

describe("api client", () => {
  it("calls /api/health and returns the typed body", async () => {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const api = createApiClient({ baseUrl: "http://app.test", fetch: fetchMock });

    const { data, error } = await api.GET("/api/health");

    expect(error).toBeUndefined();
    expect(data).toEqual({ status: "ok" });
    const request = fetchMock.mock.calls[0][0];
    expect(new URL(request.url).pathname).toBe("/api/health");
  });

  it("uses the same origin by default, so the path is exactly /api/health", async () => {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    // Node's Request needs an absolute URL; resolve relative URLs like a browser would.
    const NativeRequest = globalThis.Request;
    vi.stubGlobal(
      "Request",
      class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
          super(typeof input === "string" ? new URL(input, "http://app.test") : input, init);
        }
      },
    );
    try {
      const api = createApiClient({ fetch: fetchMock });
      await api.GET("/api/health");
    } finally {
      vi.unstubAllGlobals();
    }

    const request = fetchMock.mock.calls[0][0];
    expect(new URL(request.url).pathname).toBe("/api/health");
  });

  it("exposes the error envelope on failure", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "not_found", message: "Fant ikke siden." } }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
    );
    const api = createApiClient({ baseUrl: "http://app.test", fetch: fetchMock });

    const { data, error } = await api.GET("/api/health");

    expect(data).toBeUndefined();
    expect(error).toEqual({ error: { code: "not_found", message: "Fant ikke siden." } });
  });
});
