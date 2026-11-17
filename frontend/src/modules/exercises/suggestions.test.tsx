import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));
// Trening also shows "Start økt" (story 5.1), which navigates with the router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { profileStorageKey } from "./api";
import { Suggestions, countText, groupByLevel } from "./suggestions";

const USER_ID = "u-ola";
const STORAGE_KEY = profileStorageKey(USER_ID);
const HOME = { id: "p-home", name: "Hjemme", equipment: [] };
const GYM = { id: "p-gym", name: "Treningssenter", equipment: [] };
const EMPTY = { id: "p-empty", name: "Hytta", equipment: [] };

function exercise(n: number, level: string, muscle = "Ben", equipment = ["Kroppsvekt"]) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name: `Øvelse ${n}`,
    level,
    primary_muscle_group: muscle,
    equipment,
  };
}

// The backend's order: Nybegynner, Middels, Øvet.
const HOME_EXERCISES = [
  ...Array.from({ length: 6 }, (_, i) => exercise(i + 1, "beginner")),
  exercise(7, "intermediate", "Bryst"),
  exercise(8, "intermediate", "Mage/kjerne"),
];
const GYM_EXERCISES = [
  ...Array.from({ length: 15 }, (_, i) => exercise(i + 1, "beginner")),
  ...Array.from({ length: 13 }, (_, i) => exercise(i + 16, "intermediate", "Rygg")),
  ...Array.from({ length: 6 }, (_, i) => exercise(i + 29, "advanced", "Bryst", ["Stang og skiver"])),
];
const SUGGESTIONS: Record<string, { name: string; exercises: unknown[] }> = {
  "p-home": { name: "Hjemme", exercises: HOME_EXERCISES },
  "p-gym": { name: "Treningssenter", exercises: GYM_EXERCISES },
  "p-empty": { name: "Hytta", exercises: [] },
};

type Answer = { data?: unknown; error?: unknown };

/** Answer me, the profiles and suggestions. `getProfiles` is read on every call, and
 * `delay` can hold a profile's suggestions back until the test resolves it. */
function mockApi(
  profiles: typeof HOME[] | (() => typeof HOME[]) = [HOME, GYM],
  delay: Record<string, Promise<void>> = {},
) {
  getMock.mockImplementation(
    async (path: string, init?: { params: { query: { profile_id: string } } }): Promise<Answer> => {
      if (path === "/api/identity/me") {
        return { data: { id: USER_ID, email: "ola@eksempel.no" }, error: undefined };
      }
      if (path === "/api/workouts/active") return { data: { workout: null }, error: undefined };
      if (path === "/api/workouts") return { data: [], error: undefined };
      if (path === "/api/exercises/equipment-profiles") {
        return { data: typeof profiles === "function" ? profiles() : profiles, error: undefined };
      }
      if (path === "/api/exercises/suggestions") {
        const id = init!.params.query.profile_id;
        await delay[id];
        const result = SUGGESTIONS[id];
        if (!result) {
          const message = "Fant ikke utstyrsprofilen. Last inn siden på nytt.";
          return { error: { error: { code: "equipment_profile_not_found", message } } };
        }
        return {
          data: { profile_id: id, profile_name: result.name, exercises: result.exercises },
          error: undefined,
        };
      }
      throw new Error(`unexpected GET ${path}`);
    },
  );
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suggestions />
    </QueryClientProvider>,
  );
}

function suggestionCalls(): string[] {
  return getMock.mock.calls
    .filter(([path]) => path === "/api/exercises/suggestions")
    .map(([, init]) => init.params.query.profile_id);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  getMock.mockReset();
  vi.restoreAllMocks();
});

describe("Suggestions", () => {
  it("shows the first profile's exercises grouped by level, each linking to its detail", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Utstyr" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual([
      "Hjemme",
      "Treningssenter",
    ]);
    expect(screen.getByRole("radio", { name: "Hjemme" })).toBeChecked();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Nybegynner",
      "Middels",
    ]);
    const beginners = screen.getByRole("region", { name: "Nybegynner" });
    expect(within(beginners).getAllByRole("link")).toHaveLength(6);
    const first = within(beginners).getByRole("link", { name: /^Øvelse 1\D/ });
    expect(first).toHaveAttribute("href", `/trening/ovelser/${HOME_EXERCISES[0].id}`);
    expect(first).toHaveTextContent("Ben · Kroppsvekt");
    expect(suggestionCalls()).toEqual(["p-home"]);
  });

  it("switches to Treningssenter at once and remembers the choice", async () => {
    mockApi();
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Nybegynner",
      "Middels",
      "Øvet",
    ]);
    expect(within(screen.getByRole("region", { name: "Øvet" })).getAllByRole("link")).toHaveLength(6);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("p-gym");
  });

  it("selects the last chosen profile after a reload", async () => {
    window.localStorage.setItem(STORAGE_KEY, "p-gym");
    mockApi();
    renderPage();

    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    expect(suggestionCalls()).toEqual(["p-gym"]);
  });

  it("falls back to the first profile when the stored one is gone", async () => {
    window.localStorage.setItem(STORAGE_KEY, "p-deleted");
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("falls back to the first profile when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));
    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
  });

  it("keeps the previous list while the new profile loads", async () => {
    let release!: () => void;
    const gymLoaded = new Promise<void>((resolve) => (release = resolve));
    mockApi([HOME, GYM], { "p-gym": gymLoaded });
    renderPage();
    await screen.findByText("8 øvelser passer med Hjemme");

    fireEvent.click(screen.getByRole("radio", { name: "Treningssenter" }));

    expect(screen.getByRole("radio", { name: "Treningssenter" })).toBeChecked();
    await waitFor(() => expect(suggestionCalls()).toContain("p-gym"));
    expect(screen.getByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nybegynner" })).toBeInTheDocument();
    expect(screen.queryByTestId("exercise-list-skeleton")).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("34 øvelser passer med Treningssenter")).toBeInTheDocument();
  });

  it("falls back to the first profile when the chosen one was deleted elsewhere", async () => {
    const CABIN = { id: "p-cabin", name: "Hytta", equipment: [] };
    let listed = 0;
    window.localStorage.setItem(STORAGE_KEY, "p-cabin");
    // Listed on the first load, then deleted on the server: its suggestions are 404.
    mockApi(() => (listed++ === 0 ? [HOME, GYM, CABIN] : [HOME, GYM]));
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hjemme" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Hytta" })).not.toBeInTheDocument();
    expect(suggestionCalls()).toEqual(["p-cabin", "p-home"]);
  });

  it("says so and links to Profil when there are no profiles", async () => {
    mockApi([]);
    renderPage();

    const message = await screen.findByText(/Du har ingen utstyrsprofiler ennå/);
    expect(within(message).getByRole("link", { name: "Profil → Utstyr" })).toHaveAttribute(
      "href",
      "/profil",
    );
  });

  it("remembers the choice per user", async () => {
    window.localStorage.setItem(profileStorageKey("someone-else"), "p-gym");
    mockApi();
    renderPage();

    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("explains an empty result and links to Profil", async () => {
    mockApi([EMPTY, GYM]);
    renderPage();

    const message = await screen.findByText(/Ingen øvelser passer/);
    expect(message).toHaveTextContent(
      "Ingen øvelser passer med utstyret i «Hytta». Legg til utstyr under Profil → Utstyr.",
    );
    expect(within(message).getByRole("link", { name: "Profil → Utstyr" })).toHaveAttribute(
      "href",
      "/profil",
    );
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows skeleton rows while loading", () => {
    getMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByTestId("exercise-list-skeleton")).toBeInTheDocument();
  });

  it("shows the error and a retry button when suggestions cannot load", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === "/api/identity/me") return { data: { id: USER_ID }, error: undefined };
      if (path === "/api/exercises/equipment-profiles") return { data: [HOME], error: undefined };
      throw new Error("offline");
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    mockApi();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("8 øvelser passer med Hjemme")).toBeInTheDocument();
  });

  it("shows the error when the profiles cannot load", async () => {
    getMock.mockRejectedValue(new Error("offline"));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prøv igjen" })).toBeInTheDocument();
  });
});

describe("helpers", () => {
  it("groups by level in Nybegynner, Middels, Øvet order and hides empty groups", () => {
    const groups = groupByLevel([
      exercise(1, "advanced"),
      exercise(2, "beginner"),
      exercise(3, "advanced"),
    ] as never);
    expect(groups.map((g) => g.level)).toEqual(["beginner", "advanced"]);
    expect(groups[1].exercises.map((e) => e.name)).toEqual(["Øvelse 1", "Øvelse 3"]);
  });

  it("writes the count line", () => {
    expect(countText(8, "Hjemme")).toBe("8 øvelser passer med Hjemme");
    expect(countText(1, "Hytta")).toBe("1 øvelse passer med Hytta");
  });
});
