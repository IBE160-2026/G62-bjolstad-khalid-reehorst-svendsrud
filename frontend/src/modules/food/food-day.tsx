"use client";

import { Apple, Coffee, Sandwich, Soup, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/modules/identity/styles";
import { formatKcal } from "@/modules/profile/target-result";

import {
  useFoodDay,
  useRestoreFoodEntry,
  type FoodDay as FoodDayData,
  type FoodEntry,
} from "./api";
import { AddFoodSheet } from "./add-food-sheet";
import { MatvaretabellenAttribution } from "./attribution";
import {
  defaultMeal,
  formatGrams,
  mealLabel,
  msToNextOsloMidnight,
  osloToday,
  type Meal,
} from "./meals";
import { UndoToast, type UndoToastState } from "@/components/undo-toast";

const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sandwich,
  dinner: Soup,
  snack: Apple,
};

function MealSection({
  meal,
  summary,
  onAdd,
  onEdit,
}: {
  meal: Meal;
  summary: FoodDayData["meals"][number];
  onAdd: (meal: Meal, opener: HTMLButtonElement) => void;
  onEdit: (entry: FoodEntry, opener: HTMLButtonElement) => void;
}) {
  const Icon = MEAL_ICONS[meal];
  const headingId = `meal-${meal}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm"
      data-testid={`meal-${meal}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mark-tint text-mark"
        >
          <Icon className="size-5" />
        </span>
        <h2
          id={headingId}
          className="flex-1 text-heading font-medium text-foreground"
        >
          {mealLabel(meal)}
        </h2>
        <p
          className="text-body text-foreground tabular-nums"
          data-testid={`meal-${meal}-total`}
        >
          {formatKcal(summary.total_kcal)} kcal
        </p>
      </div>
      {summary.entries.length > 0 && (
        <ul className="-mx-2 flex flex-col divide-y divide-border">
          {summary.entries.map((entry) => (
            <li key={entry.id}>
              {/* Tapping an entry opens "Endre" (story 3.6). */}
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Endre ${entry.name}, ${formatGrams(entry.grams)} g, ${formatKcal(entry.kcal)} kcal`}
                data-entry-id={entry.id}
                onClick={(event) => onEdit(entry, event.currentTarget)}
                className="flex min-h-11 w-full items-baseline justify-between gap-3 rounded-sm px-2 py-2 text-left hover:bg-mark-tint"
              >
                <span className="text-body text-foreground">
                  {entry.name}{" "}
                  <span className="text-small text-muted-foreground tabular-nums">
                    {formatGrams(entry.grams)} g
                  </span>
                </span>
                <span className="shrink-0 text-body text-foreground tabular-nums">
                  {formatKcal(entry.kcal)} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Legg til i ${mealLabel(meal)}`}
        data-add-meal={meal}
        onClick={(event) => onAdd(meal, event.currentTarget)}
        className="min-h-11 self-start rounded-full px-2 text-button font-medium text-mark-text hover:bg-mark-tint"
      >
        + Legg til
      </button>
    </section>
  );
}

function DaySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-4"
      data-testid="food-day-skeleton"
    >
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
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
function useOsloToday(): string | null {
  return useSyncExternalStore(
    subscribeToOsloDate,
    () => osloToday(),
    () => null,
  );
}

/** Mat: today's four Meals (Europe/Oslo) with entries, Meal totals and the day total. */
export function FoodDay() {
  const date = useOsloToday();
  const day = useFoodDay(date);
  const [sheet, setSheet] = useState<{
    open: boolean;
    meal: Meal;
    fromRow: boolean;
  }>({
    open: false,
    meal: "breakfast",
    fromRow: false,
  });
  const openerRef = useRef<HTMLElement | null>(null);
  // The entry being changed in "Endre" (story 3.6), or null for "Legg til mat".
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  // Set by "Slett" just before the sheet closes, so focus can move to a row that remains.
  const deletedRef = useRef<FoodEntry | null>(null);
  const [toast, setToast] = useState<
    (UndoToastState & { entry: FoodEntry }) | null
  >(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  // "{Navn} er tilbake." after a successful "Angre", read out by the status region.
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const restore = useRestoreFoodEntry();
  const toastKey = useRef(0);
  // Where focus should land once the refetched day renders: an edited row can move to
  // another Meal, and a restored row only appears after the refetch.
  const pendingFocusRef = useRef<(() => HTMLElement | null) | null>(null);

  function focusSoon(find: () => HTMLElement | null) {
    find()?.focus();
    pendingFocusRef.current = find;
  }

  useEffect(() => {
    const find = pendingFocusRef.current;
    if (!find) return;
    pendingFocusRef.current = null;
    // Only take focus back when it was lost (the focused row or button unmounted).
    const active = document.activeElement;
    if (active === null || active === document.body) find()?.focus();
  }, [day.data]);

  function openSheet(meal: Meal, opener: HTMLElement, fromRow: boolean) {
    openerRef.current = opener;
    setEditing(null);
    setSheet({ open: true, meal, fromRow });
  }

  function openEdit(entry: FoodEntry, opener: HTMLElement) {
    openerRef.current = opener;
    setEditing(entry);
    setSheet((current) => ({ ...current, open: true }));
  }

  function closeSheet() {
    const edited = editing;
    const deleted = deletedRef.current;
    deletedRef.current = null;
    setSheet((current) => ({ ...current, open: false }));
    setEditing(null);
    if (!edited) {
      openerRef.current?.focus();
      return;
    }
    // The edited row may move to another Meal or be gone once the day is refetched:
    // focus it where it is now, or else "+ Legg til" on its Meal.
    focusSoon(
      () =>
        (!deleted &&
          document.querySelector<HTMLElement>(
            `[data-entry-id="${edited.id}"]`,
          )) ||
        document.querySelector<HTMLElement>(
          `[data-add-meal="${(deleted ?? edited).meal}"]`,
        ),
    );
  }

  function handleDeleted(entry: FoodEntry) {
    deletedRef.current = entry;
    toastKey.current += 1;
    setRestoreError(null);
    setAnnouncement(null);
    setToast({ key: toastKey.current, name: entry.name, entry });
  }

  function handleUndo() {
    if (!toast || restore.isPending) return;
    const { entry } = toast;
    // The toast (and its focused "Angre") stays, showing "Henter tilbake …", until done.
    restore.mutate(entry.id, {
      onSuccess: () => {
        setToast(null);
        setAnnouncement(`${entry.name} er tilbake.`);
        focusSoon(() =>
          document.querySelector<HTMLElement>(`[data-entry-id="${entry.id}"]`),
        );
      },
      onError: () => {
        setToast(null);
        setRestoreError(
          `Vi fikk ikke hentet tilbake ${entry.name}. Legg den til på nytt med Logg mat.`,
        );
        focusSoon(() =>
          document.querySelector<HTMLElement>(`[data-add-meal="${entry.meal}"]`),
        );
      },
    });
  }

  const isEmpty = day.data?.meals.every((meal) => meal.entries.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-medium text-muted-foreground">
            I dag
          </h2>
          <p
            className="text-title font-light text-foreground tabular-nums"
            data-testid="day-total"
          >
            {day.data ? `${formatKcal(day.data.total_kcal)} kcal` : "– kcal"}
          </p>
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={(event) =>
            openSheet(defaultMeal(), event.currentTarget, false)
          }
          className={PRIMARY_BUTTON_CLASS}
        >
          Logg mat
        </button>
      </div>

      {(date === null || day.isPending) && <DaySkeleton />}
      {day.isError && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-body text-destructive">
            {day.error.message}
          </p>
          <button
            type="button"
            onClick={() => day.refetch()}
            className={SECONDARY_BUTTON_CLASS}
          >
            Prøv igjen
          </button>
        </div>
      )}
      {day.data && (
        <>
          {isEmpty && (
            <p className="text-body text-foreground">
              Du har ikke logget noe i dag ennå. Legg til et måltid.
            </p>
          )}
          {day.data.meals.map((summary) => (
            <MealSection
              key={summary.meal}
              meal={summary.meal}
              summary={summary}
              onAdd={(meal, opener) => openSheet(meal, opener, true)}
              onEdit={openEdit}
            />
          ))}
        </>
      )}

      <MatvaretabellenAttribution />

      {date && (
        <AddFoodSheet
          open={sheet.open}
          meal={sheet.meal}
          mealFromRow={sheet.fromRow}
          date={date}
          onClose={closeSheet}
          entry={editing}
          onDeleted={handleDeleted}
        />
      )}

      <UndoToast
        toast={toast}
        restoring={restore.isPending}
        announcement={announcement}
        // The open sheet makes the page inert, so the toast cannot be used meanwhile.
        paused={sheet.open}
        error={restoreError}
        onUndo={handleUndo}
        onTimeout={() => setToast(null)}
        onDismissError={() => setRestoreError(null)}
      />
    </div>
  );
}
