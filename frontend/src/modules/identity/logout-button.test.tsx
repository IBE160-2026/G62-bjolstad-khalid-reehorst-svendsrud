import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import { ME_QUERY_KEY } from "./api";
import { LogoutButton } from "./logout-button";

function renderButton() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(ME_QUERY_KEY, { id: "1", email: "ola@eksempel.no" });
  render(
    <QueryClientProvider client={client}>
      <LogoutButton />
    </QueryClientProvider>,
  );
  return { client, button: screen.getByRole("button", { name: "Logg ut" }) };
}

afterEach(() => {
  postMock.mockReset();
  replaceMock.mockReset();
});

describe("LogoutButton", () => {
  it("logs out, forgets the user and goes to the login page", async () => {
    postMock.mockResolvedValue({ data: undefined, error: undefined });
    const { client, button } = renderButton();

    fireEvent.click(button);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/logout");
    expect(client.getQueryData(ME_QUERY_KEY)).toBeUndefined();
  });

  it("still goes to the login page when the session was already gone", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });
    const { button } = renderButton();

    fireEvent.click(button);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
  });

  it("stays and explains when the server cannot be reached", async () => {
    postMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { client, button } = renderButton();

    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    expect(replaceMock).not.toHaveBeenCalled();
    expect(client.getQueryData(ME_QUERY_KEY)).toBeDefined();
  });
});
