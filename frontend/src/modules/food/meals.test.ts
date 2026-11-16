import { describe, expect, it } from "vitest";

import {
  GRAMS_MESSAGES,
  OWN_FOOD_MESSAGES,
  defaultMeal,
  firstInvalidOwnFoodField,
  formatGrams,
  isValidEan,
  msToNextOsloMidnight,
  osloToday,
  parseGrams,
  parseServings,
  servingsToGrams,
  SERVINGS_MESSAGES,
  previewKcal,
  validateOwnFood,
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

describe("validateOwnFood", () => {
  const empty = {
    name: "",
    kcal_per_100g: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    serving_size_g: "",
    barcode: "",
  };
  const m = OWN_FOOD_MESSAGES;

  it("needs a name and kcal; the rest is optional", () => {
    expect(validateOwnFood(empty)).toEqual({
      ok: false,
      errors: { name: m.name, kcal_per_100g: m.kcalMissing },
    });
    expect(
      validateOwnFood({
        ...empty,
        name: "  Mormors lefse ",
        kcal_per_100g: "320",
      }),
    ).toEqual({
      ok: true,
      body: {
        name: "Mormors lefse",
        kcal_per_100g: 320,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        serving_size_g: null,
        barcode: null,
      },
    });
  });

  it("accepts a decimal comma and a thousands space", () => {
    const result = validateOwnFood({
      name: "Lefse",
      kcal_per_100g: "320,5",
      protein_g: "8",
      carbs_g: "50,2",
      fat_g: "10",
      serving_size_g: "1 000",
      barcode: "7038 0100 0098 0",
    });
    expect(result).toEqual({
      ok: true,
      body: {
        name: "Lefse",
        kcal_per_100g: 320.5,
        protein_g: 8,
        carbs_g: 50.2,
        fat_g: 10,
        serving_size_g: 1000,
        barcode: "7038010000980",
      },
    });
  });

  it.each([
    ["name", "x".repeat(201), m.nameLength],
    ["kcal_per_100g", "901", m.kcalRange],
    ["kcal_per_100g", "-1", m.kcalRange],
    ["kcal_per_100g", "12,34", m.decimals],
    ["kcal_per_100g", "mye", m.notNumber],
    ["protein_g", "101", m.proteinRange],
    ["carbs_g", "100,1", m.carbsRange],
    ["fat_g", "-0,1", m.fatRange],
    ["serving_size_g", "0,5", m.servingRange],
    ["serving_size_g", "2000,1", m.servingRange],
    ["barcode", "12345", m.barcode],
    ["barcode", "7038010000981", m.barcode],
  ])("%s = %s gives %s", (field, value, message) => {
    const result = validateOwnFood({
      ...empty,
      name: "Lefse",
      kcal_per_100g: "300",
      [field]: value,
    });
    expect(result).toEqual({ ok: false, errors: { [field]: message } });
  });

  it("limits protein, carbs and fat to 100 g together, shown on fat", () => {
    const base = { ...empty, name: "Lefse", kcal_per_100g: "300" };
    expect(
      validateOwnFood({ ...base, protein_g: "60", carbs_g: "60" }),
    ).toEqual({ ok: false, errors: { fat_g: m.macrosSum } });
    expect(
      validateOwnFood({ ...base, protein_g: "40", carbs_g: "40", fat_g: "20" })
        .ok,
    ).toBe(true);
  });

  it.each(["2.000", "1.500", "1.000.000"])(
    "rejects a thousands dot in %s instead of reading it as a decimal",
    (value) => {
      expect(
        validateOwnFood({
          ...empty,
          name: "Lefse",
          serving_size_g: value,
          kcal_per_100g: "300",
        }),
      ).toEqual({ ok: false, errors: { serving_size_g: m.notNumber } });
    },
  );

  it.each([
    [",5", 0.5],
    ["5,", 5],
    ["1.5", 1.5],
  ])("reads %s as %d", (value, number) => {
    const result = validateOwnFood({
      ...empty,
      name: "Lefse",
      kcal_per_100g: value,
    });
    expect(result).toMatchObject({ ok: true, body: { kcal_per_100g: number } });
  });

  it("finds the first invalid field in form order", () => {
    expect(
      firstInvalidOwnFoodField({ serving_size_g: "x", kcal_per_100g: "y" }),
    ).toBe("kcal_per_100g");
  });
});

describe("isValidEan", () => {
  it.each(["7038010000980", "7026450051051", "96385074"])(
    "accepts %s",
    (code) => {
      expect(isValidEan(code)).toBe(true);
    },
  );

  it.each(["", "12345", "7038010000981", "70380100009a0", "96385075", "703801000098"])(
    "rejects %s",
    (code) => {
      expect(isValidEan(code)).toBe(false);
    },
  );
});

describe("parseServings (story 3.5)", () => {
  it("converts servings to grams with one decimal", () => {
    expect(parseServings("1", 20)).toEqual({ grams: 20, servings: 1 });
    expect(parseServings("1,5", 33.3)).toEqual({ grams: 50, servings: 1.5 });
    expect(parseServings(",5", 60)).toEqual({ grams: 30, servings: 0.5 });
    expect(servingsToGrams(3, 33.3)).toBe(99.9);
  });

  it("rejects empty, zero, too many, two decimals and over 5 000 g", () => {
    expect(parseServings("", 20)).toEqual({ error: SERVINGS_MESSAGES.missing });
    expect(parseServings("0", 20)).toEqual({ error: SERVINGS_MESSAGES.min });
    expect(parseServings("51", 20)).toEqual({ error: SERVINGS_MESSAGES.max });
    expect(parseServings("1,25", 20)).toEqual({ error: SERVINGS_MESSAGES.decimals });
    expect(parseServings("to", 20)).toEqual({ error: SERVINGS_MESSAGES.notNumber });
    expect(parseServings("13", 400)).toEqual({ error: SERVINGS_MESSAGES.tooMuch });
  });
});
