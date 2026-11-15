import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import { ME_QUERY_KEY } from "./api";
import { LoginForm } from "./login-form";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
  return {
    client,
    email: screen.getByLabelText("E-post"),
    password: screen.getByLabelText("Passord"),
    submit: screen.getByRole("button", { name: "Logg inn" }),
  };
}

function fill(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

function rejectWith(code: string, message: string) {
  postMock.mockResolvedValue({ data: undefined, error: { error: { code, message } } });
}

afterEach(() => {
  postMock.mockReset();
  replaceMock.mockReset();
});

describe("LoginForm", () => {
  it("shows inline messages, focuses email and sends nothing when the form is empty", () => {
    const { email, password, submit } = renderForm();

    fireEvent.click(submit);

    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription("Skriv inn e-postadressen din.");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Skriv inn passordet ditt.");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("does not check the password length on login", async () => {
    rejectWith("invalid_credentials", "E-post eller passord er feil.");
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "kort");

    fireEvent.click(submit);

    expect(password).not.toHaveAttribute("aria-invalid");
    await waitFor(() => expect(postMock).toHaveBeenCalledOnce());
  });

  it("logs in, stores the user and goes to I dag", async () => {
    const user = { id: "1", email: "ola@eksempel.no" };
    postMock.mockResolvedValue({ data: user, error: undefined });
    const { client, email, password, submit } = renderForm();
    fill(email, "Ola@Eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/login", {
      body: { email: "Ola@Eksempel.no", password: "hemmelig1" },
    });
    expect(client.getQueryData(ME_QUERY_KEY)).toEqual(user);
  });

  it.each([
    ["invalid_credentials", "E-post eller passord er feil."],
    ["too_many_attempts", "For mange forsøk. Prøv igjen om litt."],
  ])("shows %s as one alert for the whole form", async (code, message) => {
    rejectWith(code, message);
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "feilpassord");

    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(password).not.toHaveAttribute("aria-invalid");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows server field errors inline", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [{ field: "email", message: "Skriv inn en gyldig e-postadresse." }],
        },
      },
    });
    const { email, password, submit } = renderForm();
    fill(email, "ola@eksempel.no");
    fill(password, "hemmelig1");

    fireEvent.click(submit);

    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAccessibleDescription("Skriv inn en gyldig e-postadresse.");
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
