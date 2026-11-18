"use client";

/**
 * The chosen date on I dag, Mat and Trening (story 6.3): read from `?dato=YYYY-MM-DD`,
 * today (Europe/Oslo) when it is missing, malformed or in the future.
 */

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

import { msToNextOsloMidnight, osloToday } from "@/modules/food/meals";

/** The pages read their date from `?dato=YYYY-MM-DD`. */
export const DATE_PARAM = "dato";

/** Nav links to these keep a valid `?dato=`; "I dag" in the nav always means today. */
export const DATED_PATHS: readonly string[] = ["/mat", "/trening"];

/** A real YYYY-MM-DD calendar date. */
export function isRealDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** A real YYYY-MM-DD calendar date not after `today`, or null (a bad or future `?dato=`
 * falls back to today). */
export function parseDateParam(value: string | null, today: string | null): string | null {
  if (!isRealDate(value)) return null;
  if (today !== null && value > today) return null;
  return value;
}

/** `date` moved by `days` (negative goes back). */
export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** The Monday of `date`'s week (weeks run Monday to Sunday). */
export function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** "mandag 16. november", with the year when it is not this year in Oslo
 * ("mandag 29. desember 2025"). For week-strip labels and date headings (story 6.3). */
export function dayText(date: string, today: string = osloToday()): string {
  const withYear = date.slice(0, 4) !== today.slice(0, 4);
  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** `path` for `date`: `?dato=` is left out for today (and when the date is unknown). */
export function datedHref(path: string, date: string | null, today: string | null): string {
  return date === null || date === today ? path : `${path}?${DATE_PARAM}=${date}`;
}

/** Longest wait between checks, so DST days and sleeping laptops still catch up. */
const MAX_DATE_CHECK_MS = 60 * 60 * 1000;

/** Re-read the date when the tab comes back and at the next Oslo midnight. */
function subscribeToOsloDate(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(
      () => {
        onChange();
        schedule();
      },
      Math.min(msToNextOsloMidnight() + 1000, MAX_DATE_CHECK_MS),
    );
  };
  schedule();
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/** Today in Oslo, read in the browser only (the clock is not known while prerendering). */
export function useOsloToday(): string | null {
  return useSyncExternalStore(
    subscribeToOsloDate,
    () => osloToday(),
    () => null,
  );
}

export type SelectedDate = {
  /** Today in Oslo; null until known in the browser. */
  today: string | null;
  /** The chosen date (today by default); null until today is known. */
  date: string | null;
  isToday: boolean;
  /** `?dato=` named a real date after today; the page shows today instead. */
  futureRequested: boolean;
};

/** The page's chosen date from `?dato=`. Needs a `<Suspense>` boundary (useSearchParams). */
export function useSelectedDate(): SelectedDate {
  const today = useOsloToday();
  const raw = useSearchParams().get(DATE_PARAM);
  const date = parseDateParam(raw, today) ?? today;
  return {
    today,
    date,
    isToday: date !== null && date === today,
    futureRequested: today !== null && isRealDate(raw) && raw > today,
  };
}
