"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/modules/identity/styles";
import { formatKcal } from "@/modules/profile/target-result";

import { useAddFoodEntry, type FoodItem } from "./api";
import { MEALS, parseGrams, previewKcal, type Meal } from "./meals";

const GRAMS_ID = "amount-grams";
const GRAMS_ERROR_ID = "amount-grams-error";
const MEAL_ID = "amount-meal";

/**
 * Grams and Meal for the chosen item, with a live kcal preview. "Lagre" logs the entry;
 * the saved kcal and totals come from the API.
 */
export function AmountPicker({
  item,
  date,
  initialMeal,
  onBack,
  onSaved,
}: {
  item: FoodItem;
  date: string;
  initialMeal: Meal;
  onBack: () => void;
  onSaved: () => void;
}) {
  const addEntry = useAddFoodEntry();
  const [gramsText, setGramsText] = useState("100");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [gramsError, setGramsError] = useState<string>();
  const gramsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gramsRef.current?.focus();
    gramsRef.current?.select();
  }, []);

  const parsed = parseGrams(gramsText);
  const preview =
    "grams" in parsed ? previewKcal(parsed.grams, item.kcal_per_100g) : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      setGramsError(parsed.error);
      gramsRef.current?.focus();
      return;
    }
    addEntry.mutate(
      { food_item_id: item.id, date, meal, grams: parsed.grams },
      {
        onSuccess: onSaved,
        onError: (error) => {
          const field =
            error instanceof ApiError &&
            error.fields.find((f) => f.field === "grams");
          if (field) {
            setGramsError(field.message);
            gramsRef.current?.focus();
          }
        },
      },
    );
  }

  // A grams error shows under the field; anything else (date, meal, item, network) shows
  // here, so a failed save is never silent.
  const errorFields =
    addEntry.error instanceof ApiError ? addEntry.error.fields : [];
  const serverError =
    addEntry.error && !errorFields.some((field) => field.field === "grams")
      ? (errorFields[0]?.message ?? addEntry.error.message)
      : undefined;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-heading font-medium text-foreground">
          {item.name}
        </h3>
        <p className="text-small text-muted-foreground tabular-nums">
          {formatKcal(item.kcal_per_100g)} kcal per 100 g
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={GRAMS_ID}
          className="text-small font-medium text-foreground"
        >
          Mengde (g)
        </label>
        <input
          id={GRAMS_ID}
          ref={gramsRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={gramsText}
          onChange={(event) => {
            setGramsText(event.target.value);
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
      </p>

      {serverError && (
        <p role="alert" className="text-small text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          className={SECONDARY_BUTTON_CLASS}
        >
          Tilbake til søket
        </button>
        <button
          type="submit"
          disabled={addEntry.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {addEntry.isPending ? "Lagrer …" : "Lagre"}
        </button>
      </div>
    </form>
  );
}
