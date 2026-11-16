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

async function openDinner() {
  renderDay();
  fireEvent.click(
    await screen.findByRole("button", { name: "Legg til i Middag" }),
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

  it("opens the sheet with Søk active, Manuelt enabled, the others disabled and the search focused", async () => {
    const dialog = await openLunch();

    expect(within(dialog).getByRole("tab", { name: "Søk" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(dialog).getByRole("tab", { name: "Manuelt" })).toBeEnabled();
    for (const name of ["Skriv strekkode", "Nylig brukt"]) {
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

  describe("own food (story 3.2)", () => {
    const LEFSE = {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Mormors lefse",
      source: "user",
      kcal_per_100g: 320,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      serving_size_g: null,
    };

    async function noMatch(dialog: HTMLElement, query = "xyzq") {
      searchResults = [];
      fireEvent.change(within(dialog).getByLabelText("Søk etter matvare"), {
        target: { value: query },
      });
      await within(dialog).findByText("Ingen treff");
    }

    it("opens the form from Ingen treff with the search text as name", async () => {
      const dialog = await openLunch();
      await noMatch(dialog);

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Registrer selv" }),
      );

      expect(within(dialog).getByLabelText("Navn")).toHaveValue("xyzq");
      expect(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
      ).toHaveFocus();
      expect(
        within(dialog).getByRole("tab", { name: "Manuelt" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    it("opens an empty form from the Manuelt tab with the name focused", async () => {
      const dialog = await openLunch();

      fireEvent.click(within(dialog).getByRole("tab", { name: "Manuelt" }));

      const name = within(dialog).getByLabelText("Navn");
      expect(name).toHaveValue("");
      expect(name).toHaveFocus();
    });

    it("validates before sending and focuses the first invalid field", async () => {
      const dialog = await openLunch();
      fireEvent.click(within(dialog).getByRole("tab", { name: "Manuelt" }));
      fireEvent.change(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
        {
          target: { value: "901" },
        },
      );
      fireEvent.change(within(dialog).getByLabelText("Protein (g)"), {
        target: { value: "40" },
      });
      fireEvent.change(within(dialog).getByLabelText("Karbohydrater (g)"), {
        target: { value: "40" },
      });
      fireEvent.change(within(dialog).getByLabelText("Fett (g)"), {
        target: { value: "40" },
      });

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      );

      expect(
        within(dialog).getByText("Skriv navnet på matvaren."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText("Kalorier per 100 g må være mellom 0 og 900."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(
          "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g.",
        ),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Navn")).toHaveFocus();
      expect(within(dialog).getByLabelText("Navn")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(postMock).not.toHaveBeenCalled();
    });

    it("shows the backend's field errors on the right field", async () => {
      const dialog = await openLunch();
      fireEvent.click(within(dialog).getByRole("tab", { name: "Manuelt" }));
      fireEvent.change(within(dialog).getByLabelText("Navn"), {
        target: { value: "Lefse" },
      });
      fireEvent.change(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
        {
          target: { value: "320" },
        },
      );
      postMock.mockResolvedValue({
        data: undefined,
        error: {
          error: {
            code: "validation_error",
            message: "Forespørselen er ugyldig.",
            fields: [
              {
                field: "kcal_per_100g",
                message: "Sjekk verdien i dette feltet.",
              },
            ],
          },
        },
      });

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      );

      expect(
        await within(dialog).findByText("Sjekk verdien i dette feltet."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
      ).toHaveFocus();
    });

    it("creates the item, opens the amount picker with the same Meal and logs it", async () => {
      const dialog = await openDinner();
      await noMatch(dialog);
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Registrer selv" }),
      );
      fireEvent.change(within(dialog).getByLabelText("Navn"), {
        target: { value: "Mormors lefse" },
      });
      fireEvent.change(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
        {
          target: { value: "320" },
        },
      );
      fireEvent.change(within(dialog).getByLabelText("Fett (g)"), {
        target: { value: "10,5" },
      });
      postMock.mockImplementation((path: string) => {
        if (path === "/api/food/items") {
          return Promise.resolve({
            data: { ...LEFSE, fat_g: 10.5 },
            error: undefined,
          });
        }
        currentDay = day([
          { name: "Mormors lefse", meal: "dinner", grams: 80, kcal: 256 },
        ]);
        return Promise.resolve({
          data: { ...currentDay.meals[2].entries[0] },
          error: undefined,
        });
      });

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      );

      expect(
        await within(dialog).findByRole("heading", { name: "Mormors lefse" }),
      ).toBeInTheDocument();
      expect(postMock).toHaveBeenCalledWith("/api/food/items", {
        body: {
          name: "Mormors lefse",
          kcal_per_100g: 320,
          protein_g: null,
          carbs_g: null,
          fat_g: 10.5,
          serving_size_g: null,
        },
      });
      expect(within(dialog).getByLabelText("Måltid")).toHaveValue("dinner");

      fireEvent.change(within(dialog).getByLabelText("Mengde (g)"), {
        target: { value: "80" },
      });
      expect(within(dialog).getByTestId("kcal-preview")).toHaveTextContent(
        "256 kcal",
      );
      fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      expect(postMock).toHaveBeenCalledWith("/api/food/entries", {
        body: {
          food_item_id: LEFSE.id,
          date: TODAY,
          meal: "dinner",
          grams: 80,
        },
      });
      await waitFor(() =>
        expect(screen.getByTestId("meal-dinner-total")).toHaveTextContent(
          "256 kcal",
        ),
      );
    });

    async function openManual() {
      const dialog = await openLunch();
      fireEvent.click(within(dialog).getByRole("tab", { name: "Manuelt" }));
      return dialog;
    }

    function type(dialog: HTMLElement, label: string, value: string) {
      fireEvent.change(within(dialog).getByLabelText(label), {
        target: { value },
      });
    }

    it("keeps a fat range error when protein or carbs change, but clears the sum error", async () => {
      const dialog = await openManual();
      const save = () =>
        fireEvent.click(
          within(dialog).getByRole("button", { name: "Lagre matvare" }),
        );
      type(dialog, "Navn", "Lefse");
      type(dialog, "Kalorier per 100 g (kcal)", "300");
      type(dialog, "Fett (g)", "101");
      save();
      expect(
        within(dialog).getByText("Fett må være mellom 0 og 100 g."),
      ).toBeInTheDocument();
      type(dialog, "Protein (g)", "5");
      expect(
        within(dialog).getByText("Fett må være mellom 0 og 100 g."),
      ).toBeInTheDocument();

      type(dialog, "Fett (g)", "50");
      type(dialog, "Karbohydrater (g)", "60");
      save();
      const sum =
        "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g.";
      expect(within(dialog).getByText(sum)).toBeInTheDocument();
      type(dialog, "Karbohydrater (g)", "10");
      expect(within(dialog).queryByText(sum)).not.toBeInTheDocument();
      expect(postMock).not.toHaveBeenCalled();
    });

    it("sends only one create when the form is submitted twice in the same tick", async () => {
      const dialog = await openManual();
      type(dialog, "Navn", "Mormors lefse");
      type(dialog, "Kalorier per 100 g (kcal)", "320");
      postMock.mockReturnValue(new Promise(() => {}));
      const form = within(dialog).getByRole("form", {
        name: "Registrer matvare",
      });

      // One act: React cannot re-render (and disable the button) between the two.
      act(() => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      await act(() => Promise.resolve());

      await waitFor(() =>
        expect(
          within(dialog).getByRole("button", { name: "Lagrer …" }),
        ).toBeDisabled(),
      );
      expect(postMock).toHaveBeenCalledTimes(1);
      expect(
        within(dialog).getByRole("button", { name: "Lagrer …" }),
      ).toBeDisabled();
    });

    it("keeps the prefilled name when the selected Manuelt tab is clicked again", async () => {
      const dialog = await openLunch();
      await noMatch(dialog);
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Registrer selv" }),
      );

      fireEvent.click(within(dialog).getByRole("tab", { name: "Manuelt" }));

      expect(within(dialog).getByLabelText("Navn")).toHaveValue("xyzq");
      expect(
        within(dialog).getByLabelText("Kalorier per 100 g (kcal)"),
      ).toHaveFocus();
    });

    it("after create, Tilbake til søket shows Søk with the new item's name searched", async () => {
      const dialog = await openManual();
      type(dialog, "Navn", "Mormors lefse");
      type(dialog, "Kalorier per 100 g (kcal)", "320");
      postMock.mockResolvedValue({ data: LEFSE, error: undefined });
      searchResults = [LEFSE];
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      );
      await within(dialog).findByRole("heading", { name: "Mormors lefse" });

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Tilbake til søket" }),
      );

      expect(within(dialog).getByRole("tab", { name: "Søk" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(within(dialog).getByLabelText("Søk etter matvare")).toHaveValue(
        "Mormors lefse",
      );
      await waitFor(() =>
        expect(getMock).toHaveBeenCalledWith("/api/food/items", {
          params: { query: { q: "Mormors lefse" } },
        }),
      );
      expect(
        await within(dialog).findByRole("option", { name: /Mormors lefse/ }),
      ).toBeInTheDocument();
    });

    it("shows a create error without fields as an alert and stays on the form", async () => {
      const dialog = await openManual();
      type(dialog, "Navn", "Mormors lefse");
      type(dialog, "Kalorier per 100 g (kcal)", "320");
      postMock.mockResolvedValue({
        data: undefined,
        error: {
          error: {
            code: "internal_error",
            message: "Noe gikk galt. Prøv igjen om litt.",
          },
        },
      });

      fireEvent.click(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Noe gikk galt. Prøv igjen om litt.",
      );
      expect(
        within(dialog).queryByLabelText("Mengde (g)"),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Lagre matvare" }),
      ).toBeEnabled();
    });
  });
});
