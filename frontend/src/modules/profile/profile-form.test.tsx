import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const putMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, PUT: putMock } }));

import { PROFILE_QUERY_KEY } from "./api";
import { ProfileSetup } from "./profile-setup";

const SARA_BODY = {
  sex: "female",
  weight_kg: 82,
  height_cm: 162,
  age: 23,
  activity_level: "light",
  goal: "lose",
};
const SARA_PROFILE = {
  ...SARA_BODY,
  target_kcal: 1640,
  floor_applied: false,
  updated_at: "2026-11-15T12:00:00Z",
};
const NOT_FOUND = {
  data: undefined,
  error: { error: { code: "profile_not_found", message: "Du har ikke satt opp profilen ennå." } },
};

const CONSENTED = { id: "1", email: "sara@eksempel.no", consent_at: "2026-11-15T12:00:00Z" };

/** Answer /api/identity/me with `me` and /api/profile with `profile`. */
function mockGet(profile: unknown, me: unknown = { data: CONSENTED, error: undefined }) {
  getMock.mockImplementation((path: string) =>
    Promise.resolve(path === "/api/profile" ? profile : me),
  );
}

function renderSetup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfileSetup />
    </QueryClientProvider>,
  );
  return client;
}

async function renderForm() {
  mockGet(NOT_FOUND);
  const client = renderSetup();
  const submit = await screen.findByRole("button", { name: "Regn ut dagens mål" });
  return { client, submit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillSara() {
  fireEvent.click(screen.getByLabelText("Kvinne"));
  fill("Vekt (kg)", "82");
  fill("Høyde (cm)", "162");
  fill("Alder (år)", "23");
  fireEvent.click(screen.getByLabelText(/Lett aktiv/));
  fireEvent.click(screen.getByLabelText("Gå ned i vekt"));
}

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
});

describe("ProfileForm", () => {
  it("shows the labels, the sex explanation and an example for every activity level", async () => {
    await renderForm();

    expect(screen.getByText("Formelen regner litt ulikt for kvinner og menn.")).toBeInTheDocument();
    for (const example of [
      "lite bevegelse i hverdagen, for eksempel kontorjobb",
      "trener 1–3 dager i uka",
      "trener 3–5 dager i uka",
      "trener 6–7 dager i uka",
      "hard trening hver dag eller fysisk tungt arbeid",
    ]) {
      expect(screen.getByText(example)).toBeInTheDocument();
    }
    for (const label of ["Mann", "Holde vekten", "Gå opp i vekt", /Stillesittende/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("focuses the first invalid field and sends nothing", async () => {
    const { submit } = await renderForm();

    fireEvent.click(submit);

    const female = screen.getByLabelText("Kvinne");
    expect(female).toHaveFocus();
    expect(screen.getByRole("group", { name: "Kjønn" })).toHaveAttribute("aria-invalid", "true");
    expect(female).toHaveAccessibleDescription(
      "Formelen regner litt ulikt for kvinner og menn. Velg kjønn.",
    );
    expect(screen.getByLabelText("Gå ned i vekt")).toHaveAccessibleDescription("Velg et mål.");
    expect(screen.getByLabelText("Vekt (kg)")).toHaveAccessibleDescription(
      "Skriv inn vekten din.",
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it("focuses a number field when it is the first invalid one", async () => {
    const { submit } = await renderForm();
    fillSara();
    fill("Høyde (cm)", "251");

    fireEvent.click(submit);

    const height = screen.getByLabelText("Høyde (cm)");
    expect(height).toHaveFocus();
    expect(height).toHaveAttribute("aria-invalid", "true");
    expect(height).toHaveAccessibleDescription("Høyde må være mellom 100 og 250 cm.");
    expect(putMock).not.toHaveBeenCalled();
  });

  it("saves and shows the target the backend returned", async () => {
    const { client, submit } = await renderForm();
    putMock.mockResolvedValue({ data: SARA_PROFILE, error: undefined });
    mockGet({ data: SARA_PROFILE, error: undefined });
    fillSara();

    fireEvent.click(submit);

    expect(await screen.findByRole("link", { name: "Videre" })).toHaveAttribute("href", "/");
    expect(document.body).toHaveTextContent("1 640 kcal om dagen");
    expect(putMock).toHaveBeenCalledWith("/api/profile", { body: SARA_BODY });
    expect(client.getQueryData(PROFILE_QUERY_KEY)).toEqual(SARA_PROFILE);
  });

  it("shows server field errors inline", async () => {
    const { submit } = await renderForm();
    putMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig. Sjekk feltene og prøv igjen.",
          fields: [{ field: "age", message: "Alder må være mellom 16 og 100 år." }],
        },
      },
    });
    fillSara();

    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByLabelText("Alder (år)")).toHaveFocus());
    expect(screen.getByText("Alder må være mellom 16 og 100 år.")).toBeInTheDocument();
  });

  it("shows other errors as one message", async () => {
    const { submit } = await renderForm();
    putMock.mockRejectedValue(new TypeError("Failed to fetch"));
    fillSara();

    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
  });
});

describe("ProfileSetup", () => {
  it("shows the stored target when the profile already exists", async () => {
    mockGet({ data: { ...SARA_PROFILE, age: 17 }, error: undefined });

    renderSetup();

    await screen.findByRole("link", { name: "Videre" });
    expect(document.body).toHaveTextContent("1 640 kcal om dagen");
    expect(
      screen.getByText("Dette er et grovt anslag. Formelen er laget for voksne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Regn ut dagens mål" })).not.toBeInTheDocument();
  });

  it("does not ask for the profile before consent", async () => {
    mockGet(NOT_FOUND, {
      data: { ...CONSENTED, consent_at: null },
      error: undefined,
    });

    renderSetup();

    await waitFor(() => expect(getMock).toHaveBeenCalledWith("/api/identity/me"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getMock).not.toHaveBeenCalledWith("/api/profile");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
