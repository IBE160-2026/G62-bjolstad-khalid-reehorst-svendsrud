import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const getMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
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
});
