"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { call } from "@/modules/identity/api";

export type FoodItem = components["schemas"]["FoodItemResponse"];
export type FoodDay = components["schemas"]["FoodDayResponse"];
export type FoodEntry = components["schemas"]["FoodEntryResponse"];
export type FoodEntryRequest = components["schemas"]["FoodEntryRequest"];
export type FoodItemCreate = components["schemas"]["FoodItemCreate"];
export type RecentFood = components["schemas"]["RecentFoodResponse"];

export const SEARCH_MIN_LENGTH = 2;

export const RECENT_FOODS_KEY = ["food-recent"] as const;

/** The user's 10 most recently logged distinct items with the last grams and Meal (3.4). */
export function useRecentFoods() {
  return useQuery({
    queryKey: RECENT_FOODS_KEY,
    queryFn: () => call(() => api.GET("/api/food/recent")),
  });
}

export function foodDayKey(date: string) {
  return ["food-day", date] as const;
}

/** One date's entries by Meal with Meal and day totals, all computed by the backend. */
export function useFoodDay(date: string | null) {
  return useQuery({
    queryKey: foodDayKey(date ?? ""),
    queryFn: () =>
      call(() =>
        api.GET("/api/food/entries", {
          params: { query: { date: date ?? "" } },
        }),
      ),
    enabled: date !== null,
  });
}

/** Shared and own food items matching `query`; nothing is asked for under 2 characters. */
export function useFoodSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["food-search", q.toLowerCase()],
    queryFn: () =>
      call(() => api.GET("/api/food/items", { params: { query: { q } } })),
    enabled: q.length >= SEARCH_MIN_LENGTH,
    staleTime: 60_000,
    // Keep showing the last results while the next query loads (no skeleton flicker).
    placeholderData: keepPreviousData,
  });
}

/**
 * Log an entry; the date's totals are refetched so Mat updates without a reload (AD-15),
 * and so is the recent list ("Nylig brukt").
 */
export function useAddFoodEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodEntryRequest) =>
      call(() => api.POST("/api/food/entries", { body })),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: RECENT_FOODS_KEY });
      return queryClient.invalidateQueries({
        queryKey: foodDayKey(entry.date),
      });
    },
  });
}

/** Register the user's own food item; searches are refetched so it shows up there too. */
export function useCreateFoodItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodItemCreate) =>
      call(() => api.POST("/api/food/items", { body })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["food-search"] }),
  });
}

/**
 * Look up a barcode on submit only (never while typing): own items, shared items, then
 * Open Food Facts. A found OFF product becomes a shared item, so searches are refetched.
 */
export function useLookupBarcode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      call(() =>
        api.GET("/api/food/barcode/{code}", { params: { path: { code } } }),
      ),
    onSuccess: (item) => {
      if (item.source === "off")
        void queryClient.invalidateQueries({ queryKey: ["food-search"] });
    },
  });
}
