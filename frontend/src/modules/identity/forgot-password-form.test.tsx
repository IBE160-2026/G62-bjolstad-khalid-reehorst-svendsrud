import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { ForgotPasswordForm, RESET_REQUESTED_MESSAGE } from "./forgot-password-form";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ForgotPasswordForm />
    </QueryClientProvider>,
  );
  return {
    email: screen.getByLabelText("E-post"),
    submit: screen.getByRole("button", { name: "Send lenke" }),
  };
}

afterEach(() => {
  postMock.mockReset();
});

describe("ForgotPasswordForm", () => {
  it("asks for the e-mail inline and sends nothing when it is empty", () => {
    const { email, submit } = renderForm();

    fireEvent.click(submit);

    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription("Skriv inn e-postadressen din.");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("sends the e-mail and always shows the same message", async () => {
    postMock.mockResolvedValue({ error: undefined });
    const { email, submit } = renderForm();
    fireEvent.change(email, { target: { value: "ola@eksempel.no" } });

    fireEvent.click(submit);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(RESET_REQUESTED_MESSAGE),
    );
    expect(RESET_REQUESTED_MESSAGE).toBe("Hvis e-posten har en konto, har vi sendt deg en lenke.");
    expect(postMock).toHaveBeenCalledWith("/api/identity/password-reset", {
      body: { email: "ola@eksempel.no" },
    });
  });

  it("shows a server field error under the field", async () => {
    postMock.mockResolvedValue({
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [{ field: "email", message: "Skriv inn en gyldig e-postadresse." }],
        },
      },
    });
    const { email, submit } = renderForm();
    fireEvent.change(email, { target: { value: "ola@eksempel.no" } });

    fireEvent.click(submit);

    await waitFor(() =>
      expect(email).toHaveAccessibleDescription("Skriv inn en gyldig e-postadresse."),
    );
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("shows a network error as an alert", async () => {
    postMock.mockRejectedValue(new TypeError("fetch failed"));
    const { email, submit } = renderForm();
    fireEvent.change(email, { target: { value: "ola@eksempel.no" } });

    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
  });
});
