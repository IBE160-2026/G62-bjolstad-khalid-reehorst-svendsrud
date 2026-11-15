import { describe, expect, it } from "vitest";

import {
  GRAMS_MESSAGES,
  defaultMeal,
  formatGrams,
  msToNextOsloMidnight,
  osloToday,
  parseGrams,
  previewKcal,
} from "./meals";

/** A UTC instant for the given Oslo wall-clock time in November (UTC+1). */
function osloNovember(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 10, 16, hour - 1, minute));
}

describe("defaultMeal", () => {
  it.each([
    [0, 0, "breakfast"],
    [9, 59, "breakfast"],
    [10, 0, "lunch"],
    [14, 59, "lunch"],
    [15, 0, "dinner"],
    [19, 59, "dinner"],
    [20, 0, "snack"],
    [23, 30, "snack"],
  ])("at %i:%i in Oslo is %s", (hour, minute, meal) => {
    expect(defaultMeal(osloNovember(hour, minute))).toBe(meal);
  });

  it("uses Oslo time in summer too (UTC+2)", () => {
    expect(defaultMeal(new Date(Date.UTC(2026, 6, 1, 8, 0)))).toBe("lunch");
  });
});

describe("osloToday", () => {
  it("is the Oslo calendar date, not the UTC one", () => {
    expect(osloToday(new Date(Date.UTC(2026, 10, 15, 23, 30)))).toBe(
      "2026-11-16",
    );
    expect(osloToday(new Date(Date.UTC(2026, 10, 16, 12, 0)))).toBe(
      "2026-11-16",
    );
  });
});

describe("previewKcal", () => {
  it("is grams × kcal per 100 g / 100, unrounded", () => {
    expect(previewKcal(150, 63)).toBe(94.5);
    expect(previewKcal(12.5, 369)).toBeCloseTo(46.125);
  });
});

describe("parseGrams", () => {
  it.each([
    ["150", 150],
    ["12,5", 12.5],
    [" 5000 ", 5000],
    ["1 000", 1000],
    ["1\u00a0000,5", 1000.5],
  ])("accepts %s", (text, grams) => {
    expect(parseGrams(text)).toEqual({ grams });
  });

  it.each([
    ["", GRAMS_MESSAGES.missing],
    ["0", GRAMS_MESSAGES.min],
    ["-5", GRAMS_MESSAGES.min],
    ["5000,1", GRAMS_MESSAGES.max],
    ["12,34", GRAMS_MESSAGES.decimals],
    ["mye", GRAMS_MESSAGES.notNumber],
  ])("rejects %j", (text, error) => {
    expect(parseGrams(text)).toEqual({ error });
  });
});

describe("formatGrams", () => {
  it.each([
    [150, "150"],
    [12.5, "12,5"],
    [1000, "1 000"],
    [4999.5, "4 999,5"],
  ])("formats %s as %s", (grams, text) => {
    expect(formatGrams(grams)).toBe(text);
  });
});

describe("msToNextOsloMidnight", () => {
  it("counts to midnight in Oslo, not UTC", () => {
    expect(msToNextOsloMidnight(new Date("2026-11-16T22:59:30Z"))).toBe(30_000);
    expect(msToNextOsloMidnight(new Date("2026-07-01T21:00:00Z"))).toBe(
      60 * 60 * 1000,
    );
  });
});
