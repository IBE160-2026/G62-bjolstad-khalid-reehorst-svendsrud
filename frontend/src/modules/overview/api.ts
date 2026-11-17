"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { mondayOf } from "@/lib/selected-date";
import { call } from "@/modules/identity/api";

export { DATE_PARAM, parseDateParam } from "@/lib/selected-date";

export type Overview = components["schemas"]["OverviewResponse"];
export type OverviewWorkout = Overview["workouts"][number];
export type OverviewSet = OverviewWorkout["exercises"][number]["sets"][number];
export type WeekDay = components["schemas"]["WeekDayResponse"];

/** Every Daily Overview; invalidate this to refresh all dates. */
export const OVERVIEW_KEY = ["overview"] as const;

/** One date's Daily Overview. Food and workout writes invalidate it for their date (AD-15). */
export function overviewKey(date: string) {
  return ["overview", date] as const;
}

/** Every week summary; invalidate this when the date of a change is unknown. */
export const OVERVIEW_WEEK_KEY = ["overview-week"] as const;

/** The week strip's marks for the week starting on Monday `start` (story 6.3). */
export function overviewWeekKey(start: string) {
  return ["overview-week", start] as const;
}

/** The week key for the week that holds `date`. */
export function overviewWeekKeyFor(date: string) {
  return overviewWeekKey(mondayOf(date));
}

/** "mat logget"/"trening logget" and "future" for Monday `start` to Sunday. */
export function useOverviewWeek(start: string | null) {
  return useQuery({
    queryKey: overviewWeekKey(start ?? ""),
    queryFn: () =>
      call(() => api.GET("/api/overview/week", { params: { query: { start: start ?? "" } } })),
    enabled: start !== null,
  });
}

/** Target, kcal eaten and remaining, the Meals and the done workouts, all from the API. */
export function useOverview(date: string | null) {
  return useQuery({
    queryKey: overviewKey(date ?? ""),
    queryFn: () =>
      call(() => api.GET("/api/overview", { params: { query: { date: date ?? "" } } })),
    enabled: date !== null,
  });
}

/** Whole kcal, rounding half up (220.5 → 221, −120.5 → −120). */
export function roundKcal(kcal: number): number {
  // `|| 0` turns −0 into 0.
  return Math.floor(kcal + 0.5) || 0;
}

/** 1640 → "1 640": a space as thousands separator (VOICE.md). */
export function kcalText(kcal: number): string {
  return String(roundKcal(kcal)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
