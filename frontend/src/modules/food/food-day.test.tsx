import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, POST: postMock } }));

import { FoodDay } from "./food-day";

// jsdom has no modal dialog; mimic the parts the browser gives us (open state, close event).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const TODAY = "2026-11-16";
const HAVREMEL = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Havremel",
  source: "matvaretabellen",
  kcal_per_100g: 369,
  protein_g: 14.1,
  carbs_g: 57.2,
  fat_g: 6.7,
};
const MILK = {
  ...HAVREMEL,
  id: "00000000-0000-4000-8000-000000000002",
  name: "Helmelk",
  kcal_per_100g: 63,
};

type Entry = { name: string; meal: string; grams: number; kcal: number };

function day(entries: Entry[] = []) {
  const meals = ["breakfast", "lunch", "dinner", "snack"].map((meal) => {
    const inMeal = entries
      .filter((entry) => entry.meal === meal)
      .map((entry, index) => ({
        id: `${meal}-${index}`,
        food_item_id: HAVREMEL.id,
        date: TODAY,
        kcal_per_100g_snapshot: 0,
        created_at: "2026-11-16T11:00:00Z",
        ...entry,
      }));
    return {
      meal,
      entries: inMeal,
      total_kcal: inMeal.reduce((sum, e) => sum + e.kcal, 0),
    };
  });
  return {
    date: TODAY,
    meals,
    total_kcal: entries.reduce((sum, e) => sum + e.kcal, 0),
  };
}

let currentDay = day();
let searchResults: unknown[] = [];

function mockApi() {
  getMock.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/api/food/entries"
        ? { data: currentDay, error: undefined }
        : { data: searchResults, error: undefined },
    ),
  );
}

function renderDay() {
  mockApi();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <FoodDay />
    </QueryClientProvider>,
  );
}

async function openLunch() {
  renderDay();
  fireEvent.click(
    await screen.findByRole("button", { name: "Legg til i Lunsj" }),
  );
  return screen.getByRole("dialog", { name: "Legg til mat" });
}

async function searchAndPick(dialog: HTMLElement, query: string, name: string) {
  fireEvent.change(within(dialog).getByLabelText("Søk etter matvare"), {
    target: { value: query },
  });
  fireEvent.click(
    await within(dialog).findByRole("option", { name: new RegExp(name) }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T11:00:00Z")); // 12:00 in Oslo
  currentDay = day();
  searchResults = [HAVREMEL];
});

afterEach(() => {
  vi.useRealTimers();
  getMock.mockReset();
  postMock.mockReset();
});

describe("FoodDay", () => {
  it("shows today's four Meals, totals from the API and the attribution", async () => {
    currentDay = day([
      { name: "Helmelk", meal: "lunch", grams: 50, kcal: 31.5 },
      { name: "Helmelk", meal: "lunch", grams: 100, kcal: 63 },
      { name: "Havremel", meal: "breakfast", grams: 400, kcal: 1476 },
    ]);
    renderDay();

    expect(await screen.findByTestId("meal-lunch-total")).toHaveTextContent(
      "95 kcal",
    );
    expect(screen.getByTestId("meal-breakfast-total")).toHaveTextContent(
      "1 476 kcal",
    );
    expect(screen.getByTestId("day-total")).toHaveTextContent("1 571 kcal");
    for (const label of ["Frokost", "Lunsj", "Middag", "Mellommåltid"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getAllByText(/Matvaretabellen 2026\. Mattilsynet\./),
    ).not.toHaveLength(0);
    expect(getMock).toHaveBeenCalledWith("/api/food/entries", {
      params: { query: { date: TODAY } },
    });
  });

  it("invites the first entry on an empty day", async () => {
    renderDay();
    expect(
      await screen.findByText(
        "Du har ikke logget noe i dag ennå. Legg til et måltid.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the sheet with Søk active, the others disabled and the search focused", async () => {
    const dialog = await openLunch();

    expect(within(dialog).getByRole("tab", { name: "Søk" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    for (const name of ["Skriv strekkode", "Nylig brukt", "Manuelt"]) {
      const tab = within(dialog).getByRole("tab", { name: new RegExp(name) });
      expect(tab).toBeDisabled();
      expect(tab).toHaveTextContent("Kommer snart");
    }
    expect(within(dialog).getByLabelText("Søk etter matvare")).toHaveFocus();
    expect(
      within(dialog).getByText(/Matvaretabellen 2026/),
    ).toBeInTheDocument();
  });

  it("shows search states: too short, results, and no match", async () => {
    const dialog = await openLunch();
    const input = within(dialog).getByLabelText("Søk etter matvare");

    fireEvent.change(input, { target: { value: "m" } });
    expect(
      within(dialog).getByText("Skriv minst to bokstaver."),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "mel" } });
    expect(
      await within(dialog).findByRole("option", { name: /Havremel/ }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/food/items", {
      params: { query: { q: "mel" } },
    });

    searchResults = [];
    fireEvent.change(input, { target: { value: "xyzq" } });
    expect(await within(dialog).findByText("Ingen treff")).toBeInTheDocument();
    expect(within(dialog).getByText("Prøv et annet ord.")).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalledWith("/api/food/items", {
      params: { query: { q: "m" } },
    });
  });

  it("Enter picks the highlighted result", async () => {
    const dialog = await openLunch();
    const input = within(dialog).getByLabelText("Søk etter matvare");
    fireEvent.change(input, { target: { value: "mel" } });
    await within(dialog).findByRole("option", { name: /Havremel/ });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      within(dialog).getByRole("heading", { name: "Havremel" }),
    ).toBeInTheDocument();
  });

  it("shows a live kcal preview while typing grams", async () => {
    searchResults = [MILK];
    const dialog = await openLunch();
    await searchAndPick(dialog, "melk", "Helmelk");

    const grams = within(dialog).getByLabelText("Mengde (g)");
    expect(grams).toHaveFocus();
    fireEvent.change(grams, { target: { value: "150" } });
    expect(within(dialog).getByTestId("kcal-preview")).toHaveTextContent(
      "95 kcal",
    );
    fireEvent.change(grams, { target: { value: "" } });
    expect(within(dialog).getByTestId("kcal-preview")).toHaveTextContent(
      "– kcal",
    );
  });

  it("validates grams before sending", async () => {
    const dialog = await openLunch();
    await searchAndPick(dialog, "mel", "Havremel");
    const grams = within(dialog).getByLabelText("Mengde (g)");

    for (const [value, message] of [
      ["0", "Skriv inn en mengde over 0 g."],
      ["5000,1", "Skriv inn en mengde på høyst 5 000 g."],
      ["12,34", "Skriv mengden med høyst én desimal."],
    ]) {
      fireEvent.change(grams, { target: { value } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));
      expect(await within(dialog).findByText(message)).toBeInTheDocument();
      expect(grams).toHaveAttribute("aria-invalid", "true");
    }
    expect(postMock).not.toHaveBeenCalled();
  });

  it("preselects the Meal from the row; Logg mat uses the time of day", async () => {
    const dialog = await openLunch();
    await searchAndPick(dialog, "mel", "Havremel");
    expect(within(dialog).getByLabelText("Måltid")).toHaveValue("lunch");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lukk" }));

    vi.setSystemTime(new Date("2026-11-16T19:30:00Z")); // 20:30 in Oslo
    fireEvent.click(screen.getByRole("button", { name: "Logg mat" }));
    await searchAndPick(dialog, "mel", "Havremel");
    expect(within(dialog).getByLabelText("Måltid")).toHaveValue("snack");
  });

  it("saves, closes the sheet and updates Lunsj and the day total without reload", async () => {
    const dialog = await openLunch();
    await searchAndPick(dialog, "mel", "Havremel");
    fireEvent.change(within(dialog).getByLabelText("Mengde (g)"), {
      target: { value: "150" },
    });
    expect(within(dialog).getByTestId("kcal-preview")).toHaveTextContent(
      "554 kcal",
    );

    postMock.mockImplementation(() => {
      currentDay = day([
        { name: "Havremel", meal: "lunch", grams: 150, kcal: 553.5 },
      ]);
      return Promise.resolve({
        data: { ...currentDay.meals[1].entries[0] },
        error: undefined,
      });
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(postMock).toHaveBeenCalledWith("/api/food/entries", {
      body: {
        food_item_id: HAVREMEL.id,
        date: TODAY,
        meal: "lunch",
        grams: 150,
      },
    });
    await waitFor(() =>
      expect(screen.getByTestId("meal-lunch-total")).toHaveTextContent(
        "554 kcal",
      ),
    );
    expect(screen.getByTestId("day-total")).toHaveTextContent("554 kcal");
    expect(screen.getByText("Havremel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Legg til i Lunsj" }),
    ).toHaveFocus();
  });

  it("shows the backend's grams field error", async () => {
    const dialog = await openLunch();
    await searchAndPick(dialog, "mel", "Havremel");
    postMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [
            {
              field: "grams",
              message: "Skriv inn en mengde på høyst 5 000 g.",
            },
          ],
        },
      },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    expect(
      await within(dialog).findByText("Skriv inn en mengde på høyst 5 000 g."),
    ).toBeInTheDocument();
    expect(dialog).toHaveAttribute("open");
  });

  it("moves the highlight with the arrow keys, clamps it, and resets it on a new query", async () => {
    searchResults = [HAVREMEL, MILK];
    const dialog = await openLunch();
    const input = within(dialog).getByRole("combobox", {
      name: "Søk etter matvare",
    });
    expect(input).toHaveAttribute("maxLength", "100");
    fireEvent.change(input, { target: { value: "mel" } });
    const [first, second] = await within(dialog).findAllByRole("option");
    expect(within(dialog).getByRole("listbox")).toHaveAttribute(
      "id",
      input.getAttribute("aria-controls"),
    );
    expect(input).toHaveAttribute("aria-expanded", "true");
    const selected = () => input.getAttribute("aria-activedescendant");

    expect(selected()).toBe(first.id);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(selected()).toBe(first.id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toBe(second.id);
    expect(second).toHaveAttribute("aria-selected", "true");

    fireEvent.change(input, { target: { value: "melk" } });
    expect(input.getAttribute("aria-activedescendant")).toMatch(/option-0$/);
    // The shown results still belong to "mel": Enter waits for the new ones.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      within(dialog).queryByLabelText("Mengde (g)"),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/api/food/items", {
        params: { query: { q: "melk" } },
      }),
    );
    await waitFor(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(
        within(dialog).getByRole("heading", { name: "Helmelk" }),
      ).toBeInTheDocument();
    });
  });

  it("shows a non-grams field error from the backend instead of failing silently", async () => {
    const dialog = await openLunch();
    await searchAndPick(dialog, "mel", "Havremel");
    postMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "validation_error",
          message: "Forespørselen er ugyldig.",
          fields: [{ field: "date", message: "Sjekk verdien i dette feltet." }],
        },
      },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Sjekk verdien i dette feltet.",
    );
    expect(dialog).toHaveAttribute("open");
  });

  it("shows grams with a thousands space", async () => {
    currentDay = day([
      { name: "Helmelk", meal: "lunch", grams: 1000, kcal: 630 },
    ]);
    renderDay();
    expect(await screen.findByText("1 000 g")).toBeInTheDocument();
  });

  it("moves to the new Oslo date at midnight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-16T22:59:30Z")); // 23:59:30 in Oslo
    renderDay();
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/api/food/entries", {
        params: { query: { date: "2026-11-16" } },
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(32_000));

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/api/food/entries", {
        params: { query: { date: "2026-11-17" } },
      }),
    );
  });

  it("re-reads the Oslo date when the tab becomes visible again", async () => {
    renderDay();
    await screen.findByTestId("meal-lunch-total");
    vi.setSystemTime(new Date("2026-11-17T07:00:00Z"));

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/api/food/entries", {
        params: { query: { date: "2026-11-17" } },
      }),
    );
  });
});
