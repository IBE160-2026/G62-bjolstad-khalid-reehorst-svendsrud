import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, POST: postMock } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

import { ME_QUERY_KEY } from "./api";
import { RegisterForm } from "./register-form";
import { SessionGuard } from "./session-guard";

const UNAUTHORIZED = {
  data: undefined,
  error: { error: { code: "unauthorized", message: "Du må logge inn." } },
};

function renderGuard() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <SessionGuard />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  replaceMock.mockReset();
  pushMock.mockReset();
});

describe("SessionGuard", () => {
  it("sends the user to the login page when the backend says the session is gone", async () => {
    getMock.mockResolvedValue(UNAUTHORIZED);

    renderGuard();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(getMock).toHaveBeenCalledOnce();
    expect(getMock).toHaveBeenCalledWith("/api/identity/me");
  });

  it("stays when the user is logged in", async () => {
    getMock.mockResolvedValue({ data: { id: "1", email: "ola@eksempel.no" }, error: undefined });

    renderGuard();

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not bounce a user who registers after an old 401", async () => {
    const user = { id: "1", email: "ola@eksempel.no" };
    getMock.mockResolvedValue(UNAUTHORIZED);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SessionGuard />
        <RegisterForm />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    replaceMock.mockReset();

    getMock.mockResolvedValue({ data: user, error: undefined });
    postMock.mockResolvedValue({ data: user, error: undefined });
    fireEvent.change(screen.getByLabelText("E-post"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Passord"), { target: { value: "hemmelig1" } });
    fireEvent.click(screen.getByRole("button", { name: "Opprett konto" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/samtykke"));
    expect(client.getQueryData(ME_QUERY_KEY)).toEqual(user);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
