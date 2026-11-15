import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import { ME_QUERY_KEY } from "./api";
import { ConsentForm } from "./consent-form";

const LABEL = "Jeg har lest dette og godtar at Prompt Force lagrer disse opplysningene.";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(ME_QUERY_KEY, { id: "1", email: "ola@eksempel.no", consent_at: null });
  render(
    <QueryClientProvider client={client}>
      <ConsentForm />
    </QueryClientProvider>,
  );
  return {
    client,
    checkbox: screen.getByLabelText(LABEL),
    button: screen.getByRole("button", { name: "Godta og fortsett" }),
  };
}

afterEach(() => {
  postMock.mockReset();
  replaceMock.mockReset();
});

describe("ConsentForm", () => {
  it("starts unticked with the button disabled", () => {
    const { checkbox, button } = renderForm();

    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).not.toBeChecked();
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("enables the button when ticked and disables it again when unticked", () => {
    const { checkbox, button } = renderForm();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(button).toBeEnabled();

    fireEvent.click(checkbox);
    expect(button).toBeDisabled();
  });

  it("stores consent, updates the user and continues to /", async () => {
    const user = { id: "1", email: "ola@eksempel.no", consent_at: "2026-11-15T12:00:00Z" };
    postMock.mockResolvedValue({ data: user, error: undefined });
    const { client, checkbox, button } = renderForm();

    fireEvent.click(checkbox);
    fireEvent.click(button);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/consent");
    expect(client.getQueryData(ME_QUERY_KEY)).toEqual(user);
  });

  it("shows the server's message and keeps the box ticked on error", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    const { checkbox, button } = renderForm();

    fireEvent.click(checkbox);
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Noe gikk galt. Prøv igjen om litt.",
    );
    expect(checkbox).toBeChecked();
    expect(button).toBeEnabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("explains when the server cannot be reached", async () => {
    postMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { checkbox, button } = renderForm();

    fireEvent.click(checkbox);
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    expect(checkbox).toBeChecked();
  });
});
