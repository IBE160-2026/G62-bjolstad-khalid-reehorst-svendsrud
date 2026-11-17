"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { call } from "@/modules/identity/api";

export type Overview = components["schemas"]["OverviewResponse"];
export type OverviewWorkout = Overview["workouts"][number];
export type OverviewSet = OverviewWorkout["exercises"][number]["sets"][number];

/** Every Daily Overview; invalidate this to refresh all dates. */
export const OVERVIEW_KEY = ["overview"] as const;

/** One date's Daily Overview. Food and workout writes invalidate it for their date (AD-15). */
export function overviewKey(date: string) {
  return ["overview", date] as const;
}

/** The I dag page reads its date from `?dato=YYYY-MM-DD`. */
export const DATE_PARAM = "dato";

/** Target, kcal eaten and remaining, the Meals and the done workouts, all from the API. */
export function useOverview(date: string | null) {
  return useQuery({
    queryKey: overviewKey(date ?? ""),
    queryFn: () =>
      call(() => api.GET("/api/overview", { params: { query: { date: date ?? "" } } })),
    enabled: date !== null,
  });
}

/** A real YYYY-MM-DD calendar date not after `today`, or null (a bad or future `?dato=`
 * falls back to today). */
export function parseDateParam(value: string | null, today: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  if (today !== null && value > today) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
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
