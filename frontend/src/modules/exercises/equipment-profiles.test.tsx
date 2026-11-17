import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({
  api: { GET: getMock, POST: postMock, PATCH: patchMock, DELETE: deleteMock },
}));

import { EquipmentProfiles } from "./equipment-profiles";

const EQUIPMENT = [
  ["kroppsvekt", "Kroppsvekt"],
  ["manualer", "Manualer"],
  ["stang-og-skiver", "Stang og skiver"],
  ["benk", "Benk"],
  ["kettlebell", "Kettlebell"],
  ["strikk", "Strikk"],
  ["trekkestang", "Trekkestang"],
  ["kabelmaskin", "Kabelmaskin"],
  ["beinpress-maskiner", "Beinpress/maskiner"],
].map(([slug, name]) => ({ slug, name }));

const HOME = { id: "p-home", name: "Hjemme", equipment: [EQUIPMENT[0]] };
const GYM = { id: "p-gym", name: "Treningssenter", equipment: EQUIPMENT };
const CABIN = { id: "p-cabin", name: "Hytta", equipment: [EQUIPMENT[0], EQUIPMENT[1]] };

let profiles: (typeof HOME)[] = [];

// jsdom has no modal dialog; mimic the parts the browser gives us (open state, close event).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

function mockGets() {
  getMock.mockImplementation(async (path: string) => {
    if (path === "/api/exercises/equipment") return { data: EQUIPMENT, error: undefined };
    if (path === "/api/exercises/equipment-profiles")
      return { data: profiles, error: undefined };
    throw new Error(`unexpected GET ${path}`);
  });
}

function renderProfiles(initial = [HOME, GYM]) {
  profiles = initial;
  mockGets();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EquipmentProfiles />
    </QueryClientProvider>,
  );
}

function errorEnvelope(code: string, message: string, fields?: object[]) {
  return { data: undefined, error: { error: { code, message, fields } } };
}

async function openEdit(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: `Endre ${name}` }));
  return screen.getByRole("dialog", { name: "Endre utstyrsprofil" });
}

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
});

describe("EquipmentProfiles", () => {
  it("lists each profile with its equipment", async () => {
    renderProfiles();

    const section = screen.getByRole("region", { name: "Utstyr" });
    const items = await within(section).findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Hjemme");
    expect(items[0]).toHaveTextContent("Kroppsvekt");
    expect(items[1]).toHaveTextContent(
      "Kroppsvekt, Manualer, Stang og skiver, Benk, Kettlebell, Strikk, Trekkestang, " +
        "Kabelmaskin, Beinpress/maskiner",
    );
    expect(screen.getByRole("button", { name: "Ny utstyrsprofil" })).toBeInTheDocument();
  });

  it("creates a profile with bodyweight locked and shows it in the list", async () => {
    renderProfiles();
    await screen.findByText("Hjemme");

    fireEvent.click(screen.getByRole("button", { name: "Ny utstyrsprofil" }));
    const dialog = screen.getByRole("dialog", { name: "Ny utstyrsprofil" });
    const bodyweight = await within(dialog).findByRole("checkbox", { name: /Kroppsvekt/ });
    expect(bodyweight).toBeChecked();
    expect(bodyweight).toBeDisabled();
    expect(within(dialog).getByText("Alltid med")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(9);

    fireEvent.change(within(dialog).getByLabelText("Navn"), { target: { value: " Hytta " } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Manualer" }));
    postMock.mockImplementation(async () => {
      profiles = [HOME, GYM, CABIN];
      return { data: CABIN, error: undefined };
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));
    expect(postMock).toHaveBeenCalledWith("/api/exercises/equipment-profiles", {
      body: { name: "Hytta", equipment: ["kroppsvekt", "manualer"] },
    });
    const row = (await screen.findByText("Hytta")).closest("li");
    expect(row).toHaveTextContent("Kroppsvekt, Manualer");
  });

  it("edits a profile; bodyweight stays ticked", async () => {
    renderProfiles();
    const dialog = await openEdit("Treningssenter");

    expect(within(dialog).getByLabelText("Navn")).toHaveValue("Treningssenter");
    const bodyweight = await within(dialog).findByRole("checkbox", { name: /Kroppsvekt/ });
    fireEvent.click(bodyweight);
    expect(bodyweight).toBeChecked();
    for (const item of EQUIPMENT.slice(2)) {
      fireEvent.click(within(dialog).getByRole("checkbox", { name: item.name }));
    }
    patchMock.mockResolvedValue({ data: { ...GYM, equipment: EQUIPMENT.slice(0, 2) } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock).toHaveBeenCalledWith("/api/exercises/equipment-profiles/{profile_id}", {
      params: { path: { profile_id: "p-gym" } },
      body: { name: "Treningssenter", equipment: ["kroppsvekt", "manualer"] },
    });
  });

  it("shows field errors from the server and a missing name before sending", async () => {
    renderProfiles();
    await screen.findByText("Hjemme");
    fireEvent.click(screen.getByRole("button", { name: "Ny utstyrsprofil" }));
    const dialog = screen.getByRole("dialog", { name: "Ny utstyrsprofil" });
    const name = within(dialog).getByLabelText("Navn");
    await within(dialog).findByRole("checkbox", { name: "Manualer" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));
    expect(await within(dialog).findByText("Skriv et navn på profilen.")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(postMock).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: "hjemme" } });
    postMock.mockResolvedValue(
      errorEnvelope("validation_error", "Forespørselen er ugyldig.", [
        { field: "name", message: "Du har allerede en profil som heter det." },
      ]),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    expect(
      await within(dialog).findByText("Du har allerede en profil som heter det."),
    ).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect((dialog as HTMLDialogElement).open).toBe(true);
  });

  it("shows the limit message when the 11th profile is refused", async () => {
    renderProfiles();
    await screen.findByText("Hjemme");
    fireEvent.click(screen.getByRole("button", { name: "Ny utstyrsprofil" }));
    const dialog = screen.getByRole("dialog", { name: "Ny utstyrsprofil" });
    fireEvent.change(within(dialog).getByLabelText("Navn"), { target: { value: "Ekstra" } });
    await within(dialog).findByRole("checkbox", { name: "Manualer" });
    postMock.mockResolvedValue(
      errorEnvelope("equipment_profile_limit", "Du kan ha opptil 10 utstyrsprofiler."),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Du kan ha opptil 10 utstyrsprofiler.",
    );
  });

  it("asks before deleting and deletes on Ja, slett", async () => {
    renderProfiles([HOME, GYM, CABIN]);
    const dialog = await openEdit("Hytta");

    fireEvent.click(within(dialog).getByRole("button", { name: "Slett profil" }));
    expect(within(dialog).getByText("Slette «Hytta»?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
    expect(within(dialog).getByLabelText("Navn")).toHaveValue("Hytta");
    expect(deleteMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Slett profil" }));
    deleteMock.mockImplementation(async () => {
      profiles = [HOME, GYM];
      return { error: undefined };
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Ja, slett" }));

    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));
    expect(deleteMock).toHaveBeenCalledWith("/api/exercises/equipment-profiles/{profile_id}", {
      params: { path: { profile_id: "p-cabin" } },
    });
    await waitFor(() => expect(screen.queryByText("Hytta")).not.toBeInTheDocument());
  });

  it("keeps the last profile and says why", async () => {
    renderProfiles([HOME]);
    const dialog = await openEdit("Hjemme");

    fireEvent.click(within(dialog).getByRole("button", { name: "Slett profil" }));
    deleteMock.mockResolvedValue(
      errorEnvelope("last_equipment_profile", "Du må ha minst én utstyrsprofil."),
    );
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Ja, slett" }));
    });

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Du må ha minst én utstyrsprofil.",
    );
    expect((dialog as HTMLDialogElement).open).toBe(true);
    expect(screen.getAllByText("Hjemme").length).toBeGreaterThan(0);
    // Focus returns to the button that started the delete, not the page.
    expect(within(dialog).getByRole("button", { name: "Slett profil" })).toHaveFocus();
  });

  it("does not save before the equipment list has loaded or when it failed", async () => {
    profiles = [HOME, GYM];
    let loadEquipment: (value: unknown) => void = () => {};
    getMock.mockImplementation((path: string) => {
      if (path === "/api/exercises/equipment")
        return new Promise((resolve) => {
          loadEquipment = resolve;
        });
      return Promise.resolve({ data: profiles, error: undefined });
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <EquipmentProfiles />
      </QueryClientProvider>,
    );
    await screen.findByText("Hjemme");
    fireEvent.click(screen.getByRole("button", { name: "Ny utstyrsprofil" }));
    const dialog = screen.getByRole("dialog", { name: "Ny utstyrsprofil" });
    fireEvent.change(within(dialog).getByLabelText("Navn"), { target: { value: "Hytta" } });

    const save = within(dialog).getByRole("button", { name: "Lagre" });
    expect(save).toBeDisabled();
    fireEvent.submit(save.closest("form") as HTMLFormElement);
    expect(postMock).not.toHaveBeenCalled();

    await act(async () => {
      loadEquipment({
        data: undefined,
        error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
      });
    });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(within(dialog).getByRole("button", { name: "Lagre" })).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("disables Ny utstyrsprofil at 10 profiles and says why", async () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({
      id: `p-${index}`,
      name: `Sted ${index}`,
      equipment: [EQUIPMENT[0]],
    }));
    renderProfiles(ten);
    await screen.findByText("Sted 9");

    const button = screen.getByRole("button", { name: "Ny utstyrsprofil" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Du kan ha opptil 10 utstyrsprofiler.");
  });

  it("allows Ny utstyrsprofil below the limit", async () => {
    renderProfiles();
    await screen.findByText("Hjemme");

    expect(screen.getByRole("button", { name: "Ny utstyrsprofil" })).toBeEnabled();
    expect(screen.queryByText("Du kan ha opptil 10 utstyrsprofiler.")).not.toBeInTheDocument();
  });
});
