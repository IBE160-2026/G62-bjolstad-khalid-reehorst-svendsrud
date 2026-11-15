import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const putMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, PUT: putMock } }));

import { ProfileEditor } from "./profile-editor";

const SARA = {
  sex: "female",
  weight_kg: 82.5,
  height_cm: 162,
  age: 23,
  activity_level: "light",
  goal: "lose",
  target_kcal: 1640,
  floor_applied: false,
  updated_at: "2026-11-15T12:00:00Z",
};

const CONSENTED = { id: "1", email: "sara@eksempel.no", consent_at: "2026-11-15T12:00:00Z" };

/** Answer /api/identity/me with `me` and /api/profile with `profile`. */
function mockGet(profile: unknown, me: unknown = CONSENTED) {
  getMock.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/api/profile"
        ? { data: profile, error: undefined }
        : { data: me, error: undefined },
    ),
  );
}

function renderEditor() {
  mockGet(SARA);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfileEditor />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
});

describe("ProfileEditor", () => {
  it("shows the current target and a form filled with the saved profile", async () => {
    renderEditor();
    expect(await screen.findByText(/1 640 kcal/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Videre" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Vekt (kg)")).toHaveValue("82,5");
    expect(screen.getByLabelText("Høyde (cm)")).toHaveValue("162");
    expect(screen.getByLabelText("Alder (år)")).toHaveValue("23");
    expect(screen.getByRole("radio", { name: "Kvinne" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Lett aktiv/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Gå ned i vekt" })).toBeChecked();
  });

  it("saves a change and shows the new target without a reload", async () => {
    renderEditor();
    await screen.findByText(/1 640 kcal/);
    const updated = { ...SARA, goal: "maintain", target_kcal: 2140 };
    putMock.mockResolvedValue({ data: updated, error: undefined });
    mockGet(updated);

    fireEvent.click(screen.getByRole("radio", { name: "Holde vekten" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre endringene" }));

    expect(await screen.findByText(/2 140 kcal/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Lagret. Dagens mål er oppdatert.");
    expect(putMock).toHaveBeenCalledWith("/api/profile", {
      body: expect.objectContaining({ goal: "maintain", weight_kg: 82.5 }),
    });
  });

  it("uses the same validation as Profiloppsett and sends nothing", async () => {
    renderEditor();
    await screen.findByText(/1 640 kcal/);
    const weight = screen.getByLabelText("Vekt (kg)");
    fireEvent.change(weight, { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre endringene" }));

    await waitFor(() => expect(weight).toHaveFocus());
    expect(screen.getByText("Vekt må være mellom 30 og 300 kg.")).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("hides an old 'Lagret' as soon as the user edits again", async () => {
    renderEditor();
    await screen.findByText(/1 640 kcal/);
    putMock.mockResolvedValue({ data: SARA, error: undefined });
    fireEvent.click(screen.getByRole("button", { name: "Lagre endringene" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Lagret. Dagens mål er oppdatert."),
    );

    fireEvent.change(screen.getByLabelText("Vekt (kg)"), { target: { value: "29" } });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("does not ask for the profile before consent", async () => {
    mockGet(SARA, { ...CONSENTED, consent_at: null });
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ProfileEditor />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("/api/identity/me"));
    expect(getMock).not.toHaveBeenCalledWith("/api/profile");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fills a whole-number weight without a decimal", async () => {
    mockGet({ ...SARA, weight_kg: 82 });
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ProfileEditor />
      </QueryClientProvider>,
    );
    expect(await screen.findByLabelText("Vekt (kg)")).toHaveValue("82");
  });
});
