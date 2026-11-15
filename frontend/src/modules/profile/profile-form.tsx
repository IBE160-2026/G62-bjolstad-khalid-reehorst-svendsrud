"use client";

import { useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { useSaveProfile } from "./api";
import {
  firstInvalidProfileField,
  isProfileField,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
  type ProfileValues,
} from "./validation";

type Choice = { value: string; label: string; example?: string };

const SEX_CHOICES: readonly Choice[] = [
  { value: "female", label: "Kvinne" },
  { value: "male", label: "Mann" },
];

const ACTIVITY_CHOICES: readonly Choice[] = [
  {
    value: "sedentary",
    label: "Stillesittende",
    example: "lite bevegelse i hverdagen, for eksempel kontorjobb",
  },
  { value: "light", label: "Lett aktiv", example: "trener 1–3 dager i uka" },
  { value: "moderate", label: "Moderat", example: "trener 3–5 dager i uka" },
  { value: "very_active", label: "Veldig aktiv", example: "trener 6–7 dager i uka" },
  {
    value: "extremely_active",
    label: "Ekstremt aktiv",
    example: "hard trening hver dag eller fysisk tungt arbeid",
  },
];

const GOAL_CHOICES: readonly Choice[] = [
  { value: "lose", label: "Gå ned i vekt" },
  { value: "maintain", label: "Holde vekten" },
  { value: "gain", label: "Gå opp i vekt" },
];

function errorId(field: ProfileField) {
  return `profile-${field}-error`;
}

function FieldError({ field, message }: { field: ProfileField; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="text-small text-destructive">
      {message}
    </p>
  );
}

function NumberField({
  field,
  label,
  unit,
  inputMode,
  error,
  onChange,
}: {
  field: ProfileField;
  label: string;
  unit: string;
  inputMode: "decimal" | "numeric";
  error?: string;
  onChange: () => void;
}) {
  const id = `profile-${field}`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small font-medium text-foreground">
        {label} ({unit})
      </label>
      <input
        id={id}
        name={field}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(field) : undefined}
        className={INPUT_CLASS}
      />
      <FieldError field={field} message={error} />
    </div>
  );
}

function ChoiceGroup({
  field,
  legend,
  hint,
  choices,
  error,
  onChange,
}: {
  field: ProfileField;
  legend: string;
  hint?: string;
  choices: readonly Choice[];
  error?: string;
  onChange: () => void;
}) {
  const hintId = `profile-${field}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId(field) : null]
    .filter(Boolean)
    .join(" ");
  return (
    // aria-invalid is not allowed on radios, so it sits on the group; the radios carry
    // the message through aria-describedby, so it is read when one gets focus.
    <fieldset aria-invalid={error ? true : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium text-foreground">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {choices.map((choice) => {
          const id = `profile-${field}-${choice.value}`;
          return (
            // The whole row is the label, so the tap target is at least 44 px high.
            <label
              key={choice.value}
              htmlFor={id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border-[1.5px] bg-card px-4 py-2 text-body text-foreground has-checked:border-primary ${
                error ? "border-destructive" : "border-input"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={field}
                value={choice.value}
                onChange={onChange}
                aria-describedby={describedBy || undefined}
                className="size-5 shrink-0 cursor-pointer accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium">{choice.label}</span>
                {choice.example && (
                  <span className="text-small text-muted-foreground">{choice.example}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError field={field} message={error} />
    </fieldset>
  );
}

function readValues(form: HTMLFormElement): ProfileValues {
  const data = new FormData(form);
  const value = (field: ProfileField) => String(data.get(field) ?? "");
  return {
    sex: value("sex"),
    weight_kg: value("weight_kg"),
    height_cm: value("height_cm"),
    age: value("age"),
    activity_level: value("activity_level"),
    goal: value("goal"),
  };
}

/** Body data, activity level and goal; the backend computes the target from them. */
export function ProfileForm() {
  const save = useSaveProfile();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function showErrors(next: ProfileErrors) {
    setErrors(next);
    const first = firstInvalidProfileField(next);
    if (!first) return;
    const form = formRef.current;
    // For a choice group, focus the chosen option if any, else the first one.
    const target =
      form?.querySelector<HTMLInputElement>(`[name="${first}"]:checked`) ??
      form?.querySelector<HTMLInputElement>(`[name="${first}"]`);
    target?.focus();
  }

  function clearError(field: ProfileField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    setFormError(null);
    const result = validateProfile(readValues(event.currentTarget));
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }
    setErrors({});

    save.mutate(result.body, {
      onError: (error) => {
        const serverErrors: ProfileErrors = {};
        if (error instanceof ApiError) {
          for (const item of error.fields) {
            if (isProfileField(item.field)) serverErrors[item.field] ??= item.message;
          }
        }
        if (firstInvalidProfileField(serverErrors)) showErrors(serverErrors);
        else setFormError(error.message);
      },
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6"
    >
      <ChoiceGroup
        field="sex"
        legend="Kjønn"
        hint="Formelen regner litt ulikt for kvinner og menn."
        choices={SEX_CHOICES}
        error={errors.sex}
        onChange={() => clearError("sex")}
      />
      <NumberField
        field="weight_kg"
        label="Vekt"
        unit="kg"
        inputMode="decimal"
        error={errors.weight_kg}
        onChange={() => clearError("weight_kg")}
      />
      <NumberField
        field="height_cm"
        label="Høyde"
        unit="cm"
        inputMode="numeric"
        error={errors.height_cm}
        onChange={() => clearError("height_cm")}
      />
      <NumberField
        field="age"
        label="Alder"
        unit="år"
        inputMode="numeric"
        error={errors.age}
        onChange={() => clearError("age")}
      />
      <ChoiceGroup
        field="activity_level"
        legend="Aktivitetsnivå"
        choices={ACTIVITY_CHOICES}
        error={errors.activity_level}
        onChange={() => clearError("activity_level")}
      />
      <ChoiceGroup
        field="goal"
        legend="Mål"
        choices={GOAL_CHOICES}
        error={errors.goal}
        onChange={() => clearError("goal")}
      />

      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      <button type="submit" disabled={save.isPending} className={PRIMARY_BUTTON_CLASS}>
        {save.isPending ? "Regner ut …" : "Regn ut dagens mål"}
      </button>
    </form>
  );
}
