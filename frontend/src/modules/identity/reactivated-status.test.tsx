import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REACTIVATED_QUERY_KEY } from "./api";
import { REACTIVATED_MESSAGE, ReactivatedStatus } from "./reactivated-status";

function renderStatus(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ReactivatedStatus />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ReactivatedStatus", () => {
  it("welcomes the user back once in a polite status after a reactivating login", async () => {
    const client = new QueryClient();
    client.setQueryData(REACTIVATED_QUERY_KEY, true);

    const { unmount } = renderStatus(client);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(status).toHaveTextContent(REACTIVATED_MESSAGE));
    expect(REACTIVATED_MESSAGE).toBe("Velkommen tilbake! Kontoen din er aktiv igjen.");
    expect(client.getQueryData(REACTIVATED_QUERY_KEY)).toBeUndefined();

    unmount();
    renderStatus(client);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows nothing after a normal login", () => {
    renderStatus(new QueryClient());

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stays until Lukk is pressed", () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    client.setQueryData(REACTIVATED_QUERY_KEY, true);
    renderStatus(client);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent(REACTIVATED_MESSAGE);

    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
