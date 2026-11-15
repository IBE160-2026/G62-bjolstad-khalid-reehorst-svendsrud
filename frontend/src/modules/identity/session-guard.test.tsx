import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, POST: postMock } }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

import { ME_QUERY_KEY } from "./api";
import { RegisterForm } from "./register-form";
import { SessionGuard, guardRedirect } from "./session-guard";

const UNAUTHORIZED = {
  data: undefined,
  error: { error: { code: "unauthorized", message: "Du må logge inn." } },
};

const CONSENTED = { id: "1", email: "ola@eksempel.no", consent_at: "2026-11-15T12:00:00Z" };
const NOT_CONSENTED = { id: "1", email: "ola@eksempel.no", consent_at: null };

function renderGuard(pathname = "/") {
  navigation.pathname = pathname;
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <SessionGuard />
    </QueryClientProvider>,
  );
  return client;
}

async function waitForMe(client: QueryClient) {
  await waitFor(() => expect(client.getQueryState(ME_QUERY_KEY)?.status).toBe("success"));
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
    getMock.mockResolvedValue({ data: CONSENTED, error: undefined });

    const client = renderGuard();

    await waitForMe(client);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it.each(["/", "/mat", "/profil", "/trening/okt"])(
    "sends a user without consent from %s to /samtykke",
    async (pathname) => {
      getMock.mockResolvedValue({ data: NOT_CONSENTED, error: undefined });

      renderGuard(pathname);

      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/samtykke"));
      expect(replaceMock).toHaveBeenCalledOnce();
    },
  );

  it("keeps a user without consent on /samtykke", async () => {
    getMock.mockResolvedValue({ data: NOT_CONSENTED, error: undefined });

    const client = renderGuard("/samtykke");

    await waitForMe(client);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("sends a user who has given consent from /samtykke to /", async () => {
    getMock.mockResolvedValue({ data: CONSENTED, error: undefined });

    renderGuard("/samtykke");

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("sends a logged-out user on /samtykke to the login page", async () => {
    getMock.mockResolvedValue(UNAUTHORIZED);

    renderGuard("/samtykke");

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(replaceMock).not.toHaveBeenCalledWith("/");
  });

  it("does not bounce a user who registers after an old 401", async () => {
    // Registration lands on /samtykke, where a user without consent stays.
    navigation.pathname = "/samtykke";
    const user = { id: "1", email: "ola@eksempel.no", consent_at: null };
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

describe("SessionGuard profile step", () => {
  const PROFILE_NOT_FOUND = {
    data: undefined,
    error: { error: { code: "profile_not_found", message: "Du har ikke satt opp profilen ennå." } },
  };
  const PROFILE = { target_kcal: 1640 };

  function mockApi(me: unknown, profile: unknown) {
    getMock.mockImplementation((path: string) =>
      Promise.resolve(path === "/api/profile" ? profile : me),
    );
  }

  it.each(["/", "/mat", "/profil"])(
    "sends a consented user without a profile from %s to /profiloppsett",
    async (pathname) => {
      mockApi({ data: CONSENTED, error: undefined }, PROFILE_NOT_FOUND);

      renderGuard(pathname);

      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/profiloppsett"));
      expect(replaceMock).toHaveBeenCalledOnce();
    },
  );

  it("keeps a consented user with a profile on /", async () => {
    mockApi({ data: CONSENTED, error: undefined }, { data: PROFILE, error: undefined });

    const client = renderGuard("/");

    await waitFor(() => expect(client.getQueryState(["profile"])?.status).toBe("success"));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("keeps a user without a profile on /profiloppsett", async () => {
    mockApi({ data: CONSENTED, error: undefined }, PROFILE_NOT_FOUND);

    const client = renderGuard("/profiloppsett");

    await waitFor(() => expect(client.getQueryState(["profile"])?.status).toBe("error"));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not ask for the profile before consent", async () => {
    mockApi({ data: NOT_CONSENTED, error: undefined }, PROFILE_NOT_FOUND);

    renderGuard("/profiloppsett");

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/samtykke"));
    expect(getMock).not.toHaveBeenCalledWith("/api/profile");
  });
});

describe("guardRedirect", () => {
  it("puts a gone session before consent", () => {
    expect(guardRedirect("/", true, null)).toBe("/logg-inn");
    expect(guardRedirect("/samtykke", true, "2026-11-15T12:00:00Z")).toBe("/logg-inn");
  });

  it("stays while the user is unknown", () => {
    expect(guardRedirect("/", false, undefined)).toBeNull();
    expect(guardRedirect("/samtykke", false, undefined)).toBeNull();
  });

  it("routes on consent", () => {
    expect(guardRedirect("/mat", false, null)).toBe("/samtykke");
    expect(guardRedirect("/samtykke", false, null)).toBeNull();
    // Consented on /samtykke: wait for the profile answer, then route on it.
    expect(guardRedirect("/samtykke", false, "2026-11-15T12:00:00Z")).toBeNull();
    expect(guardRedirect("/samtykke", false, "2026-11-15T12:00:00Z", true)).toBe("/");
    expect(guardRedirect("/mat", false, "2026-11-15T12:00:00Z")).toBeNull();
  });

  it("routes on the profile after consent", () => {
    const at = "2026-11-15T12:00:00Z";
    expect(guardRedirect("/", false, at, false)).toBe("/profiloppsett");
    expect(guardRedirect("/samtykke", false, at, false)).toBe("/profiloppsett");
    expect(guardRedirect("/profiloppsett", false, at, false)).toBeNull();
    expect(guardRedirect("/profiloppsett", false, at, true)).toBeNull();
    expect(guardRedirect("/", false, at, true)).toBeNull();
    expect(guardRedirect("/", false, at, undefined)).toBeNull();
    // Order: session, then consent, then profile.
    expect(guardRedirect("/profiloppsett", false, null, false)).toBe("/samtykke");
    expect(guardRedirect("/profiloppsett", true, at, false)).toBe("/logg-inn");
  });
});
