import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() => ({ value: "token=abc123" }));
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(searchMock.value),
}));

import { NewPasswordForm } from "./new-password-form";

const INVALID = "Lenken er utløpt eller allerede brukt. Be om en ny.";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NewPasswordForm />
    </QueryClientProvider>,
  );
}

function submitPassword(value: string) {
  fireEvent.change(screen.getByLabelText("Nytt passord"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Lagre nytt passord" }));
}

afterEach(() => {
  postMock.mockReset();
  replaceMock.mockReset();
  searchMock.value = "token=abc123";
});

describe("NewPasswordForm", () => {
  it("checks the length before sending", () => {
    renderForm();

    submitPassword("1234567");

    const input = screen.getByLabelText("Nytt passord");
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription("Velg et passord på minst 8 tegn.");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("sends token and password, then goes to the login page with a status", async () => {
    postMock.mockResolvedValue({ error: undefined });
    renderForm();

    submitPassword("nytt-passord-1");

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn?passord=endret"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/password-reset/confirm", {
      body: { token: "abc123", password: "nytt-passord-1" },
    });
  });

  it("shows an invalid link with a way to ask for a new one", async () => {
    postMock.mockResolvedValue({
      error: { error: { code: "reset_link_invalid", message: INVALID } },
    });
    renderForm();

    submitPassword("nytt-passord-1");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(INVALID);
    expect(screen.getByRole("link", { name: "Be om en ny lenke" })).toHaveAttribute(
      "href",
      "/glemt-passord",
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows a server field error under the field", async () => {
    postMock.mockResolvedValue({
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [{ field: "password", message: "Velg et passord på høyst 128 tegn." }],
        },
      },
    });
    renderForm();

    submitPassword("nytt-passord-1");

    await waitFor(() =>
      expect(screen.getByLabelText("Nytt passord")).toHaveAccessibleDescription(
        "Velg et passord på høyst 128 tegn.",
      ),
    );
  });

  it("shows the invalid-link message at once when the link has no token", () => {
    searchMock.value = "";
    renderForm();

    expect(screen.getByRole("alert")).toHaveTextContent(INVALID);
    expect(screen.queryByLabelText("Nytt passord")).toBeNull();
  });
});
