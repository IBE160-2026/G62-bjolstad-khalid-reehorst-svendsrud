/**
 * Meals, Oslo dates and the live kcal preview for Mat (story 3.1).
 * Saved entries and every total come from the API (AD-5); only the preview is computed here.
 */

import type { components } from "@/lib/api/schema";

export type Meal = components["schemas"]["Meal"];

export const MEALS: readonly { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Frokost" },
  { value: "lunch", label: "Lunsj" },
  { value: "dinner", label: "Middag" },
  { value: "snack", label: "Mellommåltid" },
];

export function mealLabel(meal: Meal): string {
  return MEALS.find((item) => item.value === meal)?.label ?? meal;
}

const OSLO = "Europe/Oslo";

/** Today's calendar date in Europe/Oslo as YYYY-MM-DD (AD-12). */
export function osloToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function osloHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: OSLO,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
}

/** Milliseconds until the next midnight in Oslo (assumes a 24-hour day; callers re-check). */
export function msToNextOsloMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OSLO,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsed =
    ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000;
  return 24 * 60 * 60 * 1000 - elapsed - now.getMilliseconds();
}

/** "Logg mat" default: before 10 Frokost, before 15 Lunsj, before 20 Middag, else Mellommåltid. */
export function defaultMeal(now: Date = new Date()): Meal {
  const hour = osloHour(now);
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 20) return "dinner";
  return "snack";
}

export const GRAMS_MAX = 5000;

export const GRAMS_MESSAGES = {
  missing: "Skriv inn hvor mange gram.",
  min: "Skriv inn en mengde over 0 g.",
  max: "Skriv inn en mengde på høyst 5 000 g.",
  decimals: "Skriv mengden med høyst én desimal.",
  notNumber: "Skriv mengden som et tall, for eksempel 150.",
} as const;

/** Grams as typed ("150", "12,5", "1 000"); mirrors the backend rules in food/schemas.py. */
export function parseGrams(
  text: string,
): { grams: number } | { error: string } {
  const value = text.replace(/\s/g, "").replace(",", ".");
  if (value === "") return { error: GRAMS_MESSAGES.missing };
  if (!/^-?\d+(\.\d+)?$/.test(value))
    return { error: GRAMS_MESSAGES.notNumber };
  const grams = Number(value);
  if (grams <= 0) return { error: GRAMS_MESSAGES.min };
  if (grams > GRAMS_MAX) return { error: GRAMS_MESSAGES.max };
  if (!/^-?\d+(\.\d)?$/.test(value)) return { error: GRAMS_MESSAGES.decimals };
  return { grams };
}

// --- Servings (story 3.5) ---------------------------------------------------------------

export const SERVINGS_MAX = 50;

export const SERVINGS_MESSAGES = {
  missing: "Skriv inn hvor mange porsjoner.",
  min: "Skriv inn mer enn 0 porsjoner.",
  max: "Skriv inn høyst 50 porsjoner.",
  decimals: "Skriv antall porsjoner med høyst én desimal.",
  notNumber: "Skriv antall porsjoner som et tall, for eksempel 1,5.",
  tooMuch: "Det blir mer enn 5 000 g. Velg færre porsjoner.",
} as const;

/** Grams for a number of servings, rounded to one decimal like every stored amount. */
export function servingsToGrams(servings: number, servingSizeG: number): number {
  // Both have at most one decimal, so multiply whole tenths to avoid float error
  // (1.5 × 33.3 = 49.95 must round to 50.0, not 49.9).
  const hundredths = Math.round(servings * 10) * Math.round(servingSizeG * 10);
  return Math.round(hundredths / 10) / 10;
}

/**
 * Servings as typed ("1", "1,5", and also ",5" or "1,") converted to grams. One decimal,
 * like grams; a leading or trailing comma is accepted here because servings are small
 * numbers people type quickly.
 */
export function parseServings(
  text: string,
  servingSizeG: number,
): { grams: number; servings: number } | { error: string } {
  let value = text.replace(/\s/g, "").replace(",", ".");
  if (value.startsWith(".")) value = `0${value}`;
  if (value.endsWith(".")) value = value.slice(0, -1);
  if (value === "") return { error: SERVINGS_MESSAGES.missing };
  if (!/^-?\d+(\.\d+)?$/.test(value)) return { error: SERVINGS_MESSAGES.notNumber };
  const servings = Number(value);
  if (servings <= 0) return { error: SERVINGS_MESSAGES.min };
  if (servings > SERVINGS_MAX) return { error: SERVINGS_MESSAGES.max };
  if (!/^-?\d+(\.\d)?$/.test(value)) return { error: SERVINGS_MESSAGES.decimals };
  const grams = servingsToGrams(servings, servingSizeG);
  if (grams > GRAMS_MAX) return { error: SERVINGS_MESSAGES.tooMuch };
  return { grams, servings };
}

/** Live preview while typing: grams × kcal per 100 g / 100, unrounded. */
export function previewKcal(grams: number, kcalPer100g: number): number {
  return (grams * kcalPer100g) / 100;
}

/** 1000 → "1 000", 12.5 → "12,5": thousands space and decimal comma, like formatKcal. */
export function formatGrams(grams: number): string {
  const [whole, decimals] = String(grams).split(".");
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimals ? `${spaced},${decimals}` : spaced;
}

// --- Barcodes (story 3.3) --------------------------------------------------------------

/** Spaces removed, as the backend does. */
export function normalizeBarcode(text: string): string {
  return text.replace(/\s/g, "");
}

/** 8 or 13 digits with a correct GS1 check digit (EAN-8/EAN-13). Mirrors food/barcode.py. */
export function isValidEan(code: string): boolean {
  if (!/^(?:[0-9]{8}|[0-9]{13})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop() as number;
  const total = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10 === check;
}

// --- Own food items (story 3.2) ---------------------------------------------------------

export type OwnFoodField =
  | "name"
  | "kcal_per_100g"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "serving_size_g"
  | "barcode";
export type OwnFoodValues = Record<OwnFoodField, string>;
export type OwnFoodErrors = Partial<Record<OwnFoodField, string>>;
export type OwnFoodBody = components["schemas"]["FoodItemCreate"];

/** Form order, used to pick the first invalid field to focus. */
export const OWN_FOOD_FIELDS: readonly OwnFoodField[] = [
  "name",
  "kcal_per_100g",
  "protein_g",
  "carbs_g",
  "fat_g",
  "serving_size_g",
  "barcode",
];

export const OWN_FOOD_MESSAGES = {
  name: "Skriv navnet på matvaren.",
  nameLength: "Skriv et navn på høyst 200 tegn.",
  kcalMissing: "Skriv inn kalorier per 100 g.",
  kcalRange: "Kalorier per 100 g må være mellom 0 og 900.",
  proteinRange: "Protein må være mellom 0 og 100 g.",
  carbsRange: "Karbohydrater må være mellom 0 og 100 g.",
  fatRange: "Fett må være mellom 0 og 100 g.",
  macrosSum:
    "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g.",
  servingRange: "Porsjonsstørrelse må være mellom 1 og 2 000 g.",
  decimals: "Skriv tallet med høyst én desimal.",
  notNumber: "Skriv et tall, for eksempel 12,5.",
  barcode: "Sjekk at strekkoden har 8 eller 13 siffer.",
} as const;

const NAME_MAX = 200;

/** A number as typed ("12,5", "1 000"); `null` when empty. Mirrors food/schemas.py. */
function parseNumberField(
  text: string,
  min: number,
  max: number,
  rangeMessage: string,
): { value: number | null } | { error: string } {
  const raw = text.replace(/\s/g, "");
  if (raw === "") return { value: null };
  // "2.000" is a Norwegian thousands dot, not 2; ask for a plain number instead.
  if (/^\d{1,3}(\.\d{3})+$/.test(raw))
    return { error: OWN_FOOD_MESSAGES.notNumber };
  const value = raw.replace(",", ".");
  // A leading or trailing decimal mark is fine: ",5" is 0.5 and "5," is 5.
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(value))
    return { error: OWN_FOOD_MESSAGES.notNumber };
  const number = Number(value);
  if (number < min || number > max) return { error: rangeMessage };
  if (!/^-?\d*(\.\d?)?$/.test(value))
    return { error: OWN_FOOD_MESSAGES.decimals };
  return { value: number };
}

export function firstInvalidOwnFoodField(
  errors: OwnFoodErrors,
): OwnFoodField | undefined {
  return OWN_FOOD_FIELDS.find((field) => errors[field]);
}

export function isOwnFoodField(field: string): field is OwnFoodField {
  return (OWN_FOOD_FIELDS as readonly string[]).includes(field);
}

/**
 * Client-side checks for "Registrer selv". The backend stays the source of truth; the
 * macro sum error sits on `fat_g`, like the backend's.
 */
export function validateOwnFood(
  values: OwnFoodValues,
): { ok: true; body: OwnFoodBody } | { ok: false; errors: OwnFoodErrors } {
  const m = OWN_FOOD_MESSAGES;
  const errors: OwnFoodErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = m.name;
  else if (name.length > NAME_MAX) errors.name = m.nameLength;

  const kcal = parseNumberField(values.kcal_per_100g, 0, 900, m.kcalRange);
  if ("error" in kcal) errors.kcal_per_100g = kcal.error;
  else if (kcal.value === null) errors.kcal_per_100g = m.kcalMissing;

  const protein = parseNumberField(values.protein_g, 0, 100, m.proteinRange);
  const carbs = parseNumberField(values.carbs_g, 0, 100, m.carbsRange);
  const fat = parseNumberField(values.fat_g, 0, 100, m.fatRange);
  if ("error" in protein) errors.protein_g = protein.error;
  if ("error" in carbs) errors.carbs_g = carbs.error;
  if ("error" in fat) errors.fat_g = fat.error;
  else {
    const sum = [protein, carbs, fat].reduce(
      (total, part) => total + ("value" in part ? (part.value ?? 0) : 0),
      0,
    );
    if (sum > 100 + 1e-9) errors.fat_g = m.macrosSum;
  }

  const serving = parseNumberField(
    values.serving_size_g,
    1,
    2000,
    m.servingRange,
  );
  if ("error" in serving) errors.serving_size_g = serving.error;

  const barcode = normalizeBarcode(values.barcode);
  if (barcode && !isValidEan(barcode)) errors.barcode = m.barcode;

  if (
    firstInvalidOwnFoodField(errors) ||
    "error" in kcal ||
    "error" in protein ||
    "error" in carbs ||
    "error" in fat ||
    "error" in serving
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    body: {
      name,
      kcal_per_100g: kcal.value ?? 0,
      protein_g: protein.value,
      carbs_g: carbs.value,
      fat_g: fat.value,
      serving_size_g: serving.value,
      barcode: barcode || null,
    },
  };
}
