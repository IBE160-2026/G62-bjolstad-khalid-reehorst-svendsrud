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
