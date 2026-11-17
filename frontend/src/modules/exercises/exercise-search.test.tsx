import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));

import type { ExerciseSearchItem } from "./api";
import { NO_MATCH_TEXT, missingText } from "./exercise-search";
import { Suggestions } from "./suggestions";

const HOME = { id: "p-home", name: "Hjemme", equipment: [] };
const GYM = { id: "p-gym", name: "Treningssenter", equipment: [] };

function item(
  n: number,
  name: string,
  fits: boolean,
  missing: string[] = [],
  equipment = ["Kroppsvekt"],
): ExerciseSearchItem {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name,
    level: "beginner",
    primary_muscle_group: "Ben",
    equipment,
    fits,
    missing_equipment: missing,
  };
}

const SQUAT = item(1, "Kroppsvektknebøy (Bodyweight squat)", true);
const BARBELL_SQUAT = item(2, "Knebøy med stang (Barbell back squat)", false, ["Stang og skiver"], [
  "Stang og skiver",
]);
// Suggestion items have no fit fields.
const SUGGESTED = [SQUAT, item(3, "Planke (Plank)", true)].map((row) => ({
  id: row.id,
  name: row.name,
  level: row.level,
  primary_muscle_group: row.primary_muscle_group,
  equipment: row.equipment,
}));

/** Search results per profile and lower-cased query; anything else is no match.
 * `state.profiles` and `state.searchFailures` let a test delete a profile or fail searches. */
const SEARCH: Record<string, Record<string, unknown[]>> = {
  "p-home": { knebøy: [SQUAT, BARBELL_SQUAT] },
  "p-gym": { knebøy: [SQUAT, { ...BARBELL_SQUAT, fits: true, missing_equipment: [] }] },
};

type Init = { params: { query: { profile_id: string; q?: string } } };

const state = { profiles: [HOME, GYM], searchFailures: 0 };

function mockApi() {
  state.profiles = [HOME, GYM];
  state.searchFailures = 0;
  getMock.mockImplementation(async (path: string, init?: Init) => {
    if (path === "/api/identity/me") {
      return { data: { id: "u-ola", email: "ola@eksempel.no" }, error: undefined };
    }
    if (path === "/api/exercises/equipment-profiles") {
      return { data: state.profiles, error: undefined };
    }
    const id = init!.params.query.profile_id;
    const name = id === "p-home" ? "Hjemme" : "Treningssenter";
    if (path === "/api/exercises/suggestions") {
      return {
        data: { profile_id: id, profile_name: name, exercises: SUGGESTED },
        error: undefined,
      };
    }
    if (path === "/api/exercises/search") {
      if (!state.profiles.some((profile) => profile.id === id)) {
        const message = "Fant ikke utstyrsprofilen. Last inn siden på nytt.";
        return { error: { error: { code: "equipment_profile_not_found", message } } };
      }
      if (state.searchFailures > 0) {
        state.searchFailures -= 1;
        const message = "Vi fikk ikke kontakt med serveren. Prøv igjen.";
        return { error: { error: { code: "internal_error", message } } };
      }
      const q = init!.params.query.q!.toLowerCase();
      return {
        data: { profile_id: id, profile_name: name, exercises: SEARCH[id][q] ?? [] },
        error: undefined,
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suggestions />
    </QueryClientProvider>,
  );
}

function searchCalls(): Array<{ profile_id: string; q: string }> {
  return getMock.mock.calls
    .filter(([path]) => path === "/api/exercises/search")
    .map(([, init]) => init.params.query);
}

async function typeSearch(value: string) {
  const field = await screen.findByLabelText("Søk etter øvelse");
  fireEvent.change(field, { target: { value } });
  return field;
}

beforeEach(() => {
  window.localStorage.clear();
  mockApi();
});

afterEach(() => {
  getMock.mockReset();
  vi.restoreAllMocks();
});

describe("Exercise search", () => {
  it("shows results flat with a hit count and marks rows that do not fit", async () => {
    renderPage();
    expect(await screen.findByText("2 øvelser passer med Hjemme")).toBeInTheDocument();

    await typeSearch("knebøy");

    expect(await screen.findByText("2 treff for Hjemme")).toBeInTheDocument();
    const results = screen.getByRole("region", { name: "Søkeresultat" });
    const links = within(results).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Kroppsvektknebøy");
    expect(links[0]).not.toHaveTextContent("Mangler");
    expect(links[1]).toHaveTextContent("Mangler: Stang og skiver");
    expect(links[1]).toHaveAttribute("href", `/trening/ovelser/${BARBELL_SQUAT.id}`);
    // Flat: no level headings while searching.
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(searchCalls()).toEqual([{ profile_id: "p-home", q: "knebøy" }]);
  });

  it("does not search under 2 characters and keeps the suggestions", async () => {
    renderPage();
    await screen.findByText("2 øvelser passer med Hjemme");

    const field = await screen.findByLabelText("Søk etter øvelse");
    expect(field).toHaveAccessibleDescription("Skriv minst 2 bokstaver.");
    vi.useFakeTimers();
    try {
      fireEvent.change(field, { target: { value: "k" } });
      act(() => {
        vi.advanceTimersByTime(400);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(searchCalls()).toEqual([]);
    expect(screen.getByText("2 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nybegynner" })).toBeInTheDocument();
  });

  it("waits for typing to pause before searching", async () => {
    renderPage();
    await screen.findByText("2 øvelser passer med Hjemme");

    const field = await typeSearch("kn");
    fireEvent.change(field, { target: { value: "kne" } });
    fireEvent.change(field, { target: { value: "knebøy" } });

    expect(await screen.findByText("2 treff for Hjemme")).toBeInTheDocument();
    expect(searchCalls()).toEqual([{ profile_id: "p-home", q: "knebøy" }]);
  });

  it("shows the spelling message when nothing matches", async () => {
    renderPage();
    await screen.findByText("2 øvelser passer med Hjemme");

    await typeSearch("zzz");

    const status = await screen.findByText(NO_MATCH_TEXT);
    expect(status).toHaveAttribute("role", "status");
    expect(screen.queryByText(/treff/)).not.toBeInTheDocument();
  });

  it("re-runs the search when the profile changes", async () => {
    renderPage();
    await typeSearch("knebøy");
    await screen.findByText("Mangler: Stang og skiver");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    await waitFor(() =>
      expect(screen.queryByText("Mangler: Stang og skiver")).not.toBeInTheDocument(),
    );
    expect(searchCalls()).toContainEqual({ profile_id: "p-gym", q: "knebøy" });
  });

  it("falls back to the first profile when the searched profile was deleted", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: "Treningssenter" }));
    await screen.findByText("2 øvelser passer med Treningssenter");
    state.profiles = [HOME]; // deleted elsewhere

    await typeSearch("knebøy");

    expect(await screen.findByText("2 treff for Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hjemme" })).toBeChecked();
    expect(searchCalls()).toEqual([
      { profile_id: "p-gym", q: "knebøy" },
      { profile_id: "p-home", q: "knebøy" },
    ]);
  });

  it("shows only the error with Prøv igjen, and retries", async () => {
    renderPage();
    await screen.findByText("2 øvelser passer med Hjemme");
    state.searchFailures = 1;

    await typeSearch("knebøy");

    expect(await screen.findByRole("alert")).toHaveTextContent("Vi fikk ikke kontakt");
    expect(screen.queryByText(/treff/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Søkeresultat" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));

    expect(await screen.findByText("2 treff for Hjemme")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears with Tøm søket: field empty, focus in it, suggestions back", async () => {
    renderPage();
    await screen.findByText("2 øvelser passer med Hjemme");
    expect(screen.queryByRole("button", { name: "Tøm søket" })).not.toBeInTheDocument();

    const field = await typeSearch("knebøy");
    await screen.findByText("2 treff for Hjemme");
    fireEvent.click(screen.getByRole("button", { name: "Tøm søket" }));

    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(screen.getByText("2 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Søkeresultat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tøm søket" })).not.toBeInTheDocument();
  });
});

describe("missingText", () => {
  it("lists the missing equipment, or nothing when it fits", () => {
    expect(missingText(SQUAT)).toBeNull();
    expect(missingText(BARBELL_SQUAT)).toBe("Mangler: Stang og skiver");
    expect(missingText(item(9, "X", false, ["Manualer", "Benk"]))).toBe("Mangler: Manualer, Benk");
  });
});
