import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: apiMock }));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/mat",
  useRouter: () => routerMock,
}));
vi.mock("@/modules/food/meals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/food/meals")>()),
  osloToday: () => "2026-11-19",
}));

import { addDays, datedHref, dayText, mondayOf } from "@/lib/selected-date";

import { FUTURE_MESSAGE, WeekStrip, dayLabel } from "./week-strip";

// Thursday 19 November 2026.
const TODAY = "2026-11-19";

function week(start: string, marks: Record<string, [boolean, boolean]> = {}) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const [food, workout] = marks[date] ?? [false, false];
    return { date, has_food: food, has_workout: workout, future: date > TODAY };
  });
}

function renderStrip(date: string, futureRequested = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <WeekStrip date={date} today={TODAY} futureRequested={futureRequested} />
    </QueryClientProvider>,
  );
  const rerender = (next: string) =>
    view.rerender(
      <QueryClientProvider client={client}>
        <WeekStrip date={next} today={TODAY} />
      </QueryClientProvider>,
    );
  return { rerender };
}

function toolbar() {
  return screen.getByRole("toolbar", { name: "Velg dag" });
}

function day(name: RegExp) {
  return within(toolbar()).getByRole("button", { name });
}

beforeEach(() => {
  apiMock.GET.mockImplementation(async (_path: string, options: { params: { query: { start: string } } }) => ({
    data: week(options.params.query.start, {
      "2026-11-16": [true, false],
      "2026-11-17": [true, true],
    }),
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("dates", () => {
  it("finds the Monday and leaves out ?dato= for today", () => {
    expect(mondayOf("2026-11-19")).toBe("2026-11-16");
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(mondayOf("2026-03-01")).toBe("2026-02-23");
    expect(datedHref("/mat", TODAY, TODAY)).toBe("/mat");
    expect(datedHref("/mat", "2026-11-16", TODAY)).toBe("/mat?dato=2026-11-16");
  });

  it("names a day starting with its visible text, then the date and what was logged", () => {
    const [monday] = week("2026-11-16");
    expect(dayLabel("2026-11-16", undefined, TODAY)).toBe("ma 16, mandag 16. november");
    expect(dayLabel("2026-11-16", monday, TODAY)).toBe(
      "ma 16, mandag 16. november, ingenting logget",
    );
    expect(
      dayLabel("2026-11-16", { ...monday, has_food: true, has_workout: true }, TODAY),
    ).toBe("ma 16, mandag 16. november, mat logget, trening logget");
    expect(dayLabel(TODAY, undefined, TODAY)).toBe("to 19 i dag, torsdag 19. november");
  });

  it("adds the year for a date in another year", () => {
    expect(dayText("2025-12-29", TODAY)).toBe("mandag 29. desember 2025");
    expect(dayText("2026-11-16", TODAY)).toBe("mandag 16. november");
  });
});

describe("WeekStrip", () => {
  it("shows Monday to Sunday with marks, today and the chosen day; future days disabled", async () => {
    renderStrip(TODAY);

    const buttons = within(toolbar()).getAllByRole("button");
    expect(buttons.map((button) => button.textContent?.replace(/i dag$/, ""))).toEqual([
      "ma 16",
      "ti 17",
      "on 18",
      "to 19",
      "fr 20",
      "lø 21",
      "sø 22",
    ]);
    expect(await within(toolbar()).findByRole("button", {
      name: "ti 17, tirsdag 17. november, mat logget, trening logget",
    })).toBeEnabled();
    expect(day(/, mandag 16\. november, mat logget$/)).toBeEnabled();
    const today = day(/, torsdag 19\. november/);
    expect(today).toHaveAttribute("aria-pressed", "true");
    expect(today).toHaveAttribute("aria-current", "date");
    expect(today).toHaveTextContent("i dag");
    expect(today).toHaveAttribute("tabindex", "0");
    expect(day(/, fredag 20/)).toBeDisabled();
    expect(day(/, søndag 22/)).toBeDisabled();
    expect(apiMock.GET).toHaveBeenCalledWith("/api/overview/week", {
      params: { query: { start: "2026-11-16" } },
    });
    expect(screen.getByRole("button", { name: "Neste uke" })).toBeDisabled();
  });

  it("choosing a day sets ?dato=, and today leaves it out", () => {
    renderStrip("2026-11-17");

    fireEvent.click(day(/, mandag 16/));
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-16");
    fireEvent.click(day(/, torsdag 19/));
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat");
    fireEvent.click(day(/, fredag 20/));
    expect(routerMock.push).toHaveBeenCalledTimes(2);
  });

  it("arrow keys move one day across weeks, never into the future", async () => {
    const { rerender } = renderStrip("2026-11-16");

    fireEvent.keyDown(day(/, mandag 16/), { key: "ArrowLeft" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-15");
    // The new day gets focus once the page shows it.
    rerender("2026-11-15");
    await waitFor(() => expect(day(/, søndag 15/)).toHaveFocus());

    fireEvent.keyDown(day(/, søndag 15/), { key: "ArrowRight" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-16");

    rerender(TODAY);
    routerMock.push.mockClear();
    fireEvent.keyDown(day(/, torsdag 19/), { key: "ArrowRight" });
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("Home and End go to Monday and Sunday (or today in this week)", () => {
    const { rerender } = renderStrip("2026-11-11");

    fireEvent.keyDown(day(/, onsdag 11/), { key: "Home" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-09");
    fireEvent.keyDown(day(/, onsdag 11/), { key: "End" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-15");

    rerender("2026-11-17");
    fireEvent.keyDown(day(/, tirsdag 17/), { key: "End" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat");
  });

  it("‹ and › step a whole week, › stops at today", () => {
    renderStrip("2026-11-10");

    fireEvent.click(screen.getByRole("button", { name: "Forrige uke" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-03");
    fireEvent.click(screen.getByRole("button", { name: "Neste uke" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-17");
  });

  it("Velg dato opens a date field limited to today", () => {
    renderStrip(TODAY);

    fireEvent.click(screen.getByRole("button", { name: "Velg dato" }));
    const field = screen.getByLabelText("Dato");
    expect(field).toHaveAttribute("type", "date");
    expect(field).toHaveAttribute("max", TODAY);
    expect(field).toHaveFocus();

    fireEvent.change(field, { target: { value: "2026-10-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Vis dagen" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-10-05");
    expect(screen.queryByLabelText("Dato")).not.toBeInTheDocument();
  });

  it("Esc closes the date field and returns focus to Velg dato", () => {
    renderStrip(TODAY);
    const opener = screen.getByRole("button", { name: "Velg dato" });
    fireEvent.click(opener);

    fireEvent.keyDown(screen.getByLabelText("Dato"), { key: "Escape" });
    expect(screen.queryByLabelText("Dato")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("a future ?dato= says so after mount and drops it from the address", async () => {
    renderStrip(TODAY, true);

    // The live region is there, empty, before the message arrives.
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status).toHaveTextContent(FUTURE_MESSAGE));
    expect(routerMock.replace).toHaveBeenCalledWith("/mat");
  });

  it("uses the API's future flag once the week has loaded", async () => {
    // The server's Oslo date is a day behind the browser's: Thursday is still future there.
    apiMock.GET.mockResolvedValue({
      data: week("2026-11-16").map((item) => ({ ...item, future: item.date >= TODAY })),
    });
    renderStrip("2026-11-18");

    await waitFor(() => expect(day(/, torsdag 19/)).toBeDisabled());
    fireEvent.click(day(/, torsdag 19/));
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("arrow keys step from the focused day", () => {
    renderStrip("2026-11-18");

    // Focus moved to Monday without choosing it (e.g. by a screen reader).
    fireEvent.keyDown(day(/, mandag 16/), { key: "ArrowRight" });
    expect(routerMock.push).toHaveBeenLastCalledWith("/mat?dato=2026-11-17");
    fireEvent.keyDown(day(/, tirsdag 17/), { key: "ArrowRight" });
    // The target is already chosen: no navigation, just focus.
    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(day(/, onsdag 18/)).toHaveFocus();
  });
});
