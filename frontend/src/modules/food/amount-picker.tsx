"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SECONDARY_DESTRUCTIVE_BUTTON_CLASS,
} from "@/modules/identity/styles";
import { formatKcal } from "@/modules/profile/target-result";

import {
  useAddFoodEntry,
  useDeleteFoodEntry,
  useUpdateFoodEntry,
  type FoodEntry,
  type FoodItem,
} from "./api";
import { OffAttribution } from "./attribution";
import {
  MEALS,
  formatGrams,
  parseGrams,
  parseServings,
  previewKcal,
  type Meal,
} from "./meals";

type Unit = "grams" | "servings";

export const GRAMS_ID = "amount-grams";
const UNIT_NAME = "amount-unit";
const GRAMS_ERROR_ID = "amount-grams-error";
const MEAL_ID = "amount-meal";

/**
 * Amount (grams, or servings when the item has a serving size — story 3.5) and Meal for
 * the chosen item, with a live kcal preview; servings are saved as grams. "Lagre" logs the entry;
 * the saved kcal and totals come from the API. Grams start at 100, or at the last amount
 * when the item comes from "Nylig brukt" (story 3.4).
 *
 * Edit mode (story 3.6, `entry` set): grams and Meal start from the entry, "Lagre
 * endringene" changes only those, and "Slett" deletes the entry at once (undo is offered
 * by the Mat page). `item` is then built from the entry, so the preview uses its snapshot.
 */
export function entryAsItem(entry: FoodEntry): FoodItem {
  return {
    id: entry.food_item_id,
    name: entry.name,
    source: entry.source,
    // The entry's own snapshot, never the item's current value (AD-6).
    kcal_per_100g: entry.kcal_per_100g_snapshot,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    serving_size_g: entry.serving_size_g,
    barcode: null,
  };
}

export function AmountPicker({
  item,
  date,
  initialMeal,
  initialGrams = 100,
  onBack,
  backLabel = "Tilbake til søket",
  onSaved,
  entry,
  onDeleted,
}: {
  item: FoodItem;
  date: string;
  initialMeal: Meal;
  initialGrams?: number;
  /** Left out in edit mode: there is nothing to go back to. */
  onBack?: () => void;
  backLabel?: string;
  onSaved: () => void;
  /** The entry being edited (story 3.6). */
  entry?: FoodEntry;
  onDeleted?: (entry: FoodEntry) => void;
}) {
  const addEntry = useAddFoodEntry();
  const updateEntry = useUpdateFoodEntry();
  const deleteEntry = useDeleteFoodEntry();
  const save = entry ? updateEntry : addEntry;
  const busy = save.isPending || deleteEntry.isPending;
  const servingSize = item.serving_size_g ?? null;
  const [unit, setUnit] = useState<Unit>("grams");
  const [gramsText, setGramsText] = useState(() => formatGrams(initialGrams));
  const [servingsText, setServingsText] = useState("1");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [gramsError, setGramsError] = useState<string>();
  const gramsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gramsRef.current?.focus();
    gramsRef.current?.select();
  }, []);

  // Switching unit keeps the amount: 60 g with 20 g servings becomes "3", and back.
  function switchUnit(next: Unit) {
    if (next === unit || servingSize === null) return;
    if ("grams" in parsed) {
      if (next === "servings") {
        const servings = Math.round((parsed.grams / servingSize) * 10) / 10;
        if (servings > 0) setServingsText(formatGrams(servings));
      } else {
        setGramsText(formatGrams(parsed.grams));
      }
    }
    setUnit(next);
    setGramsError(undefined);
  }

  const inServings = unit === "servings" && servingSize !== null;
  const parsed = inServings
    ? parseServings(servingsText, servingSize)
    : parseGrams(gramsText);
  const preview =
    "grams" in parsed ? previewKcal(parsed.grams, item.kcal_per_100g) : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      setGramsError(parsed.error);
      gramsRef.current?.focus();
      return;
    }
    const callbacks = {
      onSuccess: onSaved,
      onError: (error: Error) => {
        const field =
          error instanceof ApiError &&
          error.fields.find((f) => f.field === "grams");
        if (field) {
          setGramsError(field.message);
          gramsRef.current?.focus();
        }
      },
    };
    deleteEntry.reset();
    if (entry) {
      updateEntry.mutate(
        { id: entry.id, body: { grams: parsed.grams, meal } },
        callbacks,
      );
    } else {
      addEntry.mutate(
        { food_item_id: item.id, date, meal, grams: parsed.grams },
        callbacks,
      );
    }
  }

  function handleDelete() {
    if (!entry) return;
    save.reset();
    // No confirmation: the delete is immediate and the Mat page offers "Angre".
    deleteEntry.mutate(entry, { onSuccess: () => onDeleted?.(entry) });
  }

  // A grams error shows under the field; anything else (date, meal, item, network) shows
  // here, so a failed save is never silent.
  const errorFields = save.error instanceof ApiError ? save.error.fields : [];
  const serverError =
    save.error && !errorFields.some((field) => field.field === "grams")
      ? (errorFields[0]?.message ?? save.error.message)
      : deleteEntry.error?.message;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-heading font-medium text-foreground">
          {item.name}
        </h3>
        <p className="text-small text-muted-foreground tabular-nums">
          {formatKcal(item.kcal_per_100g)} kcal per 100 g
        </p>
        {item.source === "off" && <OffAttribution />}
      </div>

      {servingSize !== null && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium text-foreground">
            Mål i
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["grams", "Gram"],
                ["servings", "Porsjoner"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                // Only a pointer click moves on to the amount field; arrow keys stay in
                // the group so keyboard users can move between the two options.
                onPointerUp={() =>
                  setTimeout(() => {
                    gramsRef.current?.focus();
                    gramsRef.current?.select();
                  })
                }
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-input bg-card px-4 text-body text-foreground has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name={UNIT_NAME}
                  value={value}
                  checked={unit === value}
                  onChange={() => switchUnit(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <label
          htmlFor={GRAMS_ID}
          className="text-small font-medium text-foreground"
        >
          {inServings
            ? `Antall porsjoner (1 porsjon = ${formatGrams(servingSize)} g)`
            : "Mengde (g)"}
        </label>
        <input
          id={GRAMS_ID}
          ref={gramsRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={inServings ? servingsText : gramsText}
          onChange={(event) => {
            if (inServings) setServingsText(event.target.value);
            else setGramsText(event.target.value);
            setGramsError(undefined);
          }}
          aria-invalid={gramsError ? true : undefined}
          aria-describedby={gramsError ? GRAMS_ERROR_ID : undefined}
          className={INPUT_CLASS}
        />
        {gramsError && (
          <p id={GRAMS_ERROR_ID} className="text-small text-destructive">
            {gramsError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={MEAL_ID}
          className="text-small font-medium text-foreground"
        >
          Måltid
        </label>
        <select
          id={MEAL_ID}
          value={meal}
          onChange={(event) => setMeal(event.target.value as Meal)}
          className={INPUT_CLASS}
        >
          {MEALS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p
        aria-live="polite"
        className="text-title font-light text-foreground tabular-nums"
      >
        <span className="sr-only">Dette gir </span>
        <span data-testid="kcal-preview">
          {preview === null ? "–" : formatKcal(preview)} kcal
        </span>
        {inServings && "grams" in parsed && (
          <span
            data-testid="servings-grams"
            className="block text-small font-normal text-muted-foreground"
          >
            = {formatGrams(parsed.grams)} g
          </span>
        )}
      </p>

      {serverError && (
        <p role="alert" className="text-small text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {entry ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className={`${SECONDARY_DESTRUCTIVE_BUTTON_CLASS} sm:mr-auto`}
          >
            {deleteEntry.isPending ? "Sletter …" : "Slett"}
          </button>
        ) : (
          onBack && (
            <button
              type="button"
              onClick={onBack}
              className={SECONDARY_BUTTON_CLASS}
            >
              {backLabel}
            </button>
          )
        )}
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
          {save.isPending ? "Lagrer …" : entry ? "Lagre endringene" : "Lagre"}
        </button>
      </div>
    </form>
  );
}
