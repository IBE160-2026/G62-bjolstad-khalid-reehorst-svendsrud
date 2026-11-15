import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));

import { HealthStatus } from "./health-status";

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HealthStatus />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  getMock.mockReset();
});

describe("HealthStatus", () => {
  it("shows Backend: ok when /api/health succeeds", async () => {
    getMock.mockResolvedValue({ data: { status: "ok" }, error: undefined });
    renderStatus();
    expect(await screen.findByText("Backend: ok")).toHaveAttribute("role", "status");
    expect(getMock).toHaveBeenCalledWith("/api/health");
  });

  it("shows the backend message when /api/health fails", async () => {
    getMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unavailable", message: "Tjenesten er nede." } },
    });
    renderStatus();
    expect(
      await screen.findByText("Backend: utilgjengelig (Tjenesten er nede.)"),
    ).toHaveAttribute("role", "status");
  });
});
