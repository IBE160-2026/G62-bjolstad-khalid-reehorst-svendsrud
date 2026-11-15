import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { RegisterForm } from "./register-form";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RegisterForm />
    </QueryClientProvider>,
  );
  return {
    email: screen.getByLabelText("E-post"),
    password: screen.getByLabelText("Passord"),
    submit: screen.getByRole("button", { name: "Opprett konto" }),
  };
}

function fill(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

afterEach(() => {
  postMock.mockReset();
  pushMock.mockReset();
});

describe("RegisterForm", () => {
  it("shows inline messages, focuses email and sends nothing when the form is empty", () => {
    const { email, password, submit } = renderForm();

    fireEvent.click(submit);

    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Skriv inn e-postadressen din.");
    expect(password).toHaveAccessibleDescription("Velg et passord på minst 8 tegn.");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("focuses the password when only the password is invalid", () => {
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "kort");

    fireEvent.click(submit);

    expect(password).toHaveFocus();
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("Velg et passord på minst 8 tegn.")).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("clears a field's error when the user changes that field", () => {
    const { email, password, submit } = renderForm();
    fireEvent.click(submit);

    fill(email, "ola@eksempel.no");

    expect(email).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Skriv inn e-postadressen din.")).not.toBeInTheDocument();
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Velg et passord på minst 8 tegn.");
  });

  it("registers and sends the user to the consent page", async () => {
    postMock.mockResolvedValue({ data: { id: "1", email: "ola@eksempel.no" }, error: undefined });
    const { email, password, submit } = renderForm();
    fill(email, "Ola@Eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/samtykke"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/register", {
      body: { email: "Ola@Eksempel.no", password: "hemmelig1" },
    });
  });

  it("shows server field errors the same way", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [{ field: "password", message: "Velg et passord på høyst 128 tegn." }],
        },
      },
    });
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveAccessibleDescription("Velg et passord på høyst 128 tegn.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows an unavailable email under the email field", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "email_unavailable",
          message: "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet.",
        },
      },
    });
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAccessibleDescription(
      "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet.",
    );
  });

  it("shows a calm message when the server cannot be reached", async () => {
    postMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
  });
});
