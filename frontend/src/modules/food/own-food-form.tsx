"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { useCreateFoodItem, type FoodItem } from "./api";
import {
  OWN_FOOD_MESSAGES,
  firstInvalidOwnFoodField,
  isOwnFoodField,
  validateOwnFood,
  type OwnFoodErrors,
  type OwnFoodField,
  type OwnFoodValues,
} from "./meals";

export const OWN_FOOD_NAME_ID = "own-food-name";

function inputId(field: OwnFoodField) {
  return field === "name" ? OWN_FOOD_NAME_ID : `own-food-${field}`;
}

function errorId(field: OwnFoodField) {
  return `own-food-${field}-error`;
}

function Field({
  field,
  label,
  value,
  error,
  inputMode,
  maxLength,
  onChange,
}: {
  field: OwnFoodField;
  label: string;
  value: string;
  error?: string;
  inputMode?: "decimal";
  maxLength?: number;
  onChange: (field: OwnFoodField, value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor={inputId(field)}
        className="text-small font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={inputId(field)}
        name={field}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(field) : undefined}
        className={INPUT_CLASS}
      />
      {error && (
        <p id={errorId(field)} className="text-small text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * "Registrer selv" (story 3.2): name and kcal per 100 g are required; macros and serving
 * size are optional. Saving creates the user's own food item and hands it to `onCreated`.
 */
export function OwnFoodForm({
  initialName = "",
  onCreated,
}: {
  initialName?: string;
  onCreated: (item: FoodItem) => void;
}) {
  const create = useCreateFoodItem();
  const [values, setValues] = useState<OwnFoodValues>({
    name: initialName,
    kcal_per_100g: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    serving_size_g: "",
  });
  const [errors, setErrors] = useState<OwnFoodErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Blocks a second submit in the same tick, before isPending has re-rendered.
  const submitting = useRef(false);

  useEffect(() => {
    // A prefilled name is usually right; the next thing to type is kcal.
    const first = initialName.trim() ? "kcal_per_100g" : "name";
    document.getElementById(inputId(first))?.focus();
  }, [initialName]);

  function showErrors(next: OwnFoodErrors) {
    setErrors(next);
    const first = firstInvalidOwnFoodField(next);
    if (first) document.getElementById(inputId(first))?.focus();
  }

  function handleChange(field: OwnFoodField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setErrors((current) => {
      // The macro sum error sits on fat but depends on all three; a fat range error
      // stays until fat itself changes.
      const touched: OwnFoodField[] =
        (field === "protein_g" || field === "carbs_g") &&
        current.fat_g === OWN_FOOD_MESSAGES.macrosSum
          ? [field, "fat_g"]
          : [field];
      if (!touched.some((name) => current[name])) return current;
      const next = { ...current };
      for (const name of touched) delete next[name];
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setFormError(null);
    const result = validateOwnFood(values);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }
    setErrors({});
    submitting.current = true;
    create.mutate(result.body, {
      onSettled: () => {
        submitting.current = false;
      },
      onSuccess: onCreated,
      onError: (error) => {
        const serverErrors: OwnFoodErrors = {};
        if (error instanceof ApiError) {
          for (const item of error.fields) {
            if (isOwnFoodField(item.field))
              serverErrors[item.field] ??= item.message;
          }
        }
        if (firstInvalidOwnFoodField(serverErrors)) showErrors(serverErrors);
        else setFormError(error.message);
      },
    });
  }

  const fieldProps = (field: OwnFoodField) => ({
    field,
    value: values[field],
    error: errors[field],
    onChange: handleChange,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Registrer matvare"
      className="flex flex-col gap-5"
    >
      <p className="text-small text-muted-foreground">
        Du finner tallene på pakken. Bare du ser matvarer du registrerer selv.
      </p>
      <Field {...fieldProps("name")} label="Navn" maxLength={200} />
      <Field
        {...fieldProps("kcal_per_100g")}
        label="Kalorier per 100 g (kcal)"
        inputMode="decimal"
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-small font-medium text-foreground">
          Per 100 g (valgfritt)
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            {...fieldProps("protein_g")}
            label="Protein (g)"
            inputMode="decimal"
          />
          <Field
            {...fieldProps("carbs_g")}
            label="Karbohydrater (g)"
            inputMode="decimal"
          />
          <Field
            {...fieldProps("fat_g")}
            label="Fett (g)"
            inputMode="decimal"
          />
        </div>
      </fieldset>

      <Field
        {...fieldProps("serving_size_g")}
        label="Porsjonsstørrelse (g, valgfritt)"
        inputMode="decimal"
      />

      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className={PRIMARY_BUTTON_CLASS}
      >
        {create.isPending ? "Lagrer …" : "Lagre matvare"}
      </button>
    </form>
  );
}
