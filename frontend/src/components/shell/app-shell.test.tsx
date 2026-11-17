import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/", search: "" }));
const getMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ replace: replaceMock }),
}));

import { ME_QUERY_KEY } from "@/modules/identity/api";

import { AppShell } from "./app-shell";

function renderShell(pathname: string) {
  navigation.pathname = pathname;
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AppShell>
        <p>Innhold</p>
      </AppShell>
    </QueryClientProvider>,
  );
  return client;
}

// jsdom has no modal dialog; enough for the first-run intro to open.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

/** A consented user who has not closed the intro and has no profile yet. */
function mockNewConsentedUser() {
  getMock.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/api/identity/me"
        ? {
            data: {
              id: "1",
              email: "ola@eksempel.no",
              consent_at: "2026-11-15T10:00:00Z",
              intro_dismissed_at: null,
            },
            error: undefined,
          }
        : {
            data: undefined,
            error: { error: { code: "profile_not_found", message: "Fant ingen profil." } },
          },
    ),
  );
}

afterEach(() => {
  getMock.mockReset();
  replaceMock.mockReset();
});

describe("AppShell", () => {
  it("renders the login page without navigation and without asking who is logged in", async () => {
    renderShell("/logg-inn");

    expect(screen.getByRole("heading", { level: 1, name: "Logg inn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bytt til (mørk|lys) modus/ })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profil" })).not.toBeInTheDocument();
    expect(screen.getByText("Innhold")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getMock).not.toHaveBeenCalled();
  });

  it("renders /samtykke without navigation but checks the session", async () => {
    getMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });

    renderShell("/samtykke");

    expect(screen.getByRole("heading", { level: 1, name: "Samtykke" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profil" })).not.toBeInTheDocument();
    expect(screen.getByText("Innhold")).toBeInTheDocument();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(getMock).toHaveBeenCalledWith("/api/identity/me");
  });

  it("renders /profiloppsett without navigation but checks the session", async () => {
    getMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });

    renderShell("/profiloppsett");

    expect(screen.getByRole("heading", { level: 1, name: "Profiloppsett" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profil" })).not.toBeInTheDocument();
    expect(screen.getByText("Innhold")).toBeInTheDocument();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(getMock).toHaveBeenCalledWith("/api/identity/me");
  });

  it("sends a user without consent from app pages to /samtykke", async () => {
    getMock.mockResolvedValue({
      data: { id: "1", email: "ola@eksempel.no", consent_at: null },
      error: undefined,
    });

    renderShell("/");

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/samtykke"));
  });

  it("keeps a user without consent on /samtykke", async () => {
    getMock.mockResolvedValue({
      data: { id: "1", email: "ola@eksempel.no", consent_at: null },
      error: undefined,
    });

    const client = renderShell("/samtykke");

    await waitFor(() => expect(client.getQueryState(ME_QUERY_KEY)?.status).toBe("success"));
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the navigation on app pages and sends a logged-out user to /logg-inn", async () => {
    getMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });

    renderShell("/");

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Profil" }).length).toBeGreaterThan(0);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(getMock).toHaveBeenCalledWith("/api/identity/me");
  });

  it("shows the first-run intro over /profiloppsett for a new consented user", async () => {
    mockNewConsentedUser();

    renderShell("/profiloppsett");

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Slik kommer du i gang" })).toBeInTheDocument(),
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("opens the first-run intro once when the guard moves a new user from / to setup", async () => {
    mockNewConsentedUser();
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    navigation.pathname = "/";
    const client = new QueryClient();
    const tree = () => (
      <QueryClientProvider client={client}>
        <AppShell>
          <p>Innhold</p>
        </AppShell>
      </QueryClientProvider>
    );
    const { rerender } = render(tree());

    const dialog = await screen.findByRole("dialog", { name: "Slik kommer du i gang" });
    // The profile guard still sends a user without a profile to setup.
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/profiloppsett"));
    navigation.pathname = "/profiloppsett";
    rerender(tree());

    expect(
      await screen.findByRole("heading", { level: 1, name: "Profiloppsett" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Slik kommer du i gang" })).toBe(dialog);
    expect(showModal).toHaveBeenCalledTimes(1);
    showModal.mockRestore();
  });
});
