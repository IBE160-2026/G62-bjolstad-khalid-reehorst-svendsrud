"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { call, callNoContent } from "@/modules/identity/api";
import { overviewKey } from "@/modules/overview/api";

export type FoodItem = components["schemas"]["FoodItemResponse"];
export type FoodDay = components["schemas"]["FoodDayResponse"];
export type FoodEntry = components["schemas"]["FoodEntryResponse"];
export type FoodEntryRequest = components["schemas"]["FoodEntryRequest"];
export type FoodEntryUpdate = components["schemas"]["FoodEntryUpdate"];
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

/** Refetch the date's totals, its Daily Overview and the recent list after an entry
 * changes (AD-15, NFR9). */
function invalidateEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  date: string,
) {
  void queryClient.invalidateQueries({ queryKey: RECENT_FOODS_KEY });
  void queryClient.invalidateQueries({ queryKey: overviewKey(date) });
  return queryClient.invalidateQueries({ queryKey: foodDayKey(date) });
}

/**
 * Log an entry; the date's totals and I dag are refetched so Mat updates without a reload (AD-15),
 * and so is the recent list ("Nylig brukt").
 */
export function useAddFoodEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodEntryRequest) =>
      call(() => api.POST("/api/food/entries", { body })),
    onSuccess: (entry) => invalidateEntry(queryClient, entry.date),
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

/** Shared by edit and delete, so the sheet can tell when one is still in flight. */
export const ENTRY_CHANGE_KEY = ["food-entry-change"] as const;


/** Change grams and/or Meal of an entry (3.6); the date and kcal snapshot never change. */
export function useUpdateFoodEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_CHANGE_KEY,
    mutationFn: ({ id, body }: { id: string; body: FoodEntryUpdate }) =>
      call(() =>
        api.PATCH("/api/food/entries/{entry_id}", {
          params: { path: { entry_id: id } },
          body,
        }),
      ),
    // Refetch in the background: the sheet closes without waiting for the day.
    onSuccess: (entry) => {
      void invalidateEntry(queryClient, entry.date);
    },
  });
}

/** Delete an entry at once (3.6); it can be restored with "Angre" for a short while. */
export function useDeleteFoodEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ENTRY_CHANGE_KEY,
    mutationFn: (entry: Pick<FoodEntry, "id" | "date">) =>
      callNoContent(() =>
        api.DELETE("/api/food/entries/{entry_id}", {
          params: { path: { entry_id: entry.id } },
        }),
      ),
    // Refetch in the background: the undo toast shows without waiting for the day.
    onSuccess: (_data, entry) => {
      void invalidateEntry(queryClient, entry.date);
    },
  });
}

/** Bring back a just-deleted entry ("Angre"): same id, grams, Meal and snapshot. */
export function useRestoreFoodEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(() =>
        api.POST("/api/food/entries/{entry_id}/restore", {
          params: { path: { entry_id: id } },
        }),
      ),
    onSuccess: (entry) => invalidateEntry(queryClient, entry.date),
  });
}
