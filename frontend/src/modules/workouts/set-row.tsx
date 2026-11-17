"use client";

import { Check, Trash2 } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { ApiError } from "@/modules/identity/api";

import {
  formatNumber,
  parseNumber,
  SUGGESTED_REPS,
  type SetValues,
  type WorkoutSet,
} from "./api";

type Field = "reps" | "weight_kg" | "seconds";

/** Shown when the text is not a number at all; the server checks the range. */
const NOT_A_NUMBER: Record<Field, string> = {
  reps: "Skriv repetisjoner som et helt tall fra 1 til 100.",
  weight_kg: "Skriv kg som et tall fra 0 til 500, med høyst to desimaler.",
  seconds: "Skriv sekunder som et helt tall fra 1 til 3600.",
};

/** A save failed for another reason than the value (network, server). */
export const NOT_SAVED_MESSAGE = "Ikke lagret – prøv igjen.";

const INPUT_CLASS =
  "h-11 w-full min-w-0 rounded-md border-[1.5px] border-border bg-card px-2 text-body text-foreground placeholder:text-muted-foreground aria-invalid:border-destructive";

export const ICON_BUTTON_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-70";

function without<T>(
  record: Partial<Record<Field, T>>,
  fields: Field[],
): Partial<Record<Field, T>> {
  const next = { ...record };
  for (const field of fields) delete next[field];
  return next;
}

/** Field errors from a failed save, by field; other errors go to `onError`. */
function fieldErrors(error: unknown): Partial<Record<Field, string>> | null {
  if (!(error instanceof ApiError) || error.fields.length === 0) return null;
  const errors: Partial<Record<Field, string>> = {};
  for (const field of error.fields) {
    if (field.field === "reps" || field.field === "weight_kg" || field.field === "seconds") {
      errors[field.field] = field.message;
    }
  }
  return errors;
}

/**
 * One set (story 5.2): "Sett {n}", reps + kg (or seconds for a time exercise), "Ferdig" and
 * "Slett sett {n}". A value is saved when its field loses focus or on Enter. While a field
 * is being edited (or its save failed) it shows the typed text, so a field error never
 * wipes what the user wrote.
 */
export function SetRow({
  set,
  type,
  exerciseName,
  onSave,
  onDelete,
}: {
  set: WorkoutSet;
  type: "reps" | "time";
  /** Added to every accessible name, which would otherwise repeat across exercises. */
  exerciseName: string;
  /** Saves the changed values; resolves on success, rejects with the server's error. */
  onSave: (values: Partial<SetValues>) => Promise<unknown>;
  onDelete: () => void;
}) {
  const number = set.position + 1;
  const fields: Field[] = type === "time" ? ["seconds"] : ["reps", "weight_kg"];
  // Typed text not yet saved; null shows the saved value.
  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  // Set when ticking "Ferdig" failed: the message for a failure with no field error, or ""
  // when the reason is shown under a field. Null once a save of "Ferdig" works.
  const [doneError, setDoneError] = useState<string | null>(null);

  function shown(field: Field): string {
    return drafts[field] ?? formatNumber(set[field]);
  }

  /** The draft values that differ from the saved ones, or null if one is not a number. */
  function changedValues(): Partial<SetValues> | null {
    const values: Partial<SetValues> = {};
    const nextErrors = { ...errors };
    let ok = true;
    for (const field of fields) {
      const draft = drafts[field];
      if (draft === undefined) continue;
      const parsed = parseNumber(draft);
      if (parsed === undefined) {
        nextErrors[field] = NOT_A_NUMBER[field];
        ok = false;
      } else if (parsed !== set[field]) {
        values[field] = parsed;
      }
    }
    if (!ok) {
      setErrors(nextErrors);
      return null;
    }
    return values;
  }

  function save(values: Partial<SetValues>, sentFields: Field[]) {
    const withDone = values.done !== undefined;
    onSave(values).then(
      () => {
        setDrafts((current) => without(current, sentFields));
        setErrors((current) => without(current, sentFields));
        if (withDone) setDoneError(null);
      },
      (error: unknown) => {
        const byField = fieldErrors(error);
        if (byField) {
          setErrors((current) => ({ ...current, ...byField }));
          if (withDone) setDoneError("");
          return;
        }
        // Not about a value: mark what was not saved, and keep the typed text.
        const notSaved: Partial<Record<Field, string>> = {};
        for (const field of sentFields) notSaved[field] = NOT_SAVED_MESSAGE;
        setErrors((current) => ({ ...current, ...notSaved }));
        if (withDone) setDoneError(sentFields.length === 0 ? NOT_SAVED_MESSAGE : "");
      },
    );
  }

  function saveField(field: Field) {
    const draft = drafts[field];
    if (draft === undefined) return;
    const parsed = parseNumber(draft);
    if (parsed === undefined) {
      setErrors((current) => ({ ...current, [field]: NOT_A_NUMBER[field] }));
      return;
    }
    if (parsed === set[field]) {
      // Unchanged (e.g. "12,50" for 12.5): show the saved value again.
      setDrafts((current) => without(current, [field]));
      setErrors((current) => without(current, [field]));
      return;
    }
    save({ [field]: parsed }, [field]);
  }

  function toggleDone(done: boolean) {
    const values = changedValues();
    if (values === null) return;
    const reps = "reps" in values ? values.reps : set.reps;
    if (done && type === "reps" && reps === null) {
      values.reps = SUGGESTED_REPS; // the suggestion shown as placeholder
    }
    save({ ...values, done }, Object.keys(values) as Field[]);
  }

  function onKeyDown(field: Field) {
    return (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveField(field);
      }
    };
  }

  const labels: Record<Field, string> = {
    reps: "Repetisjoner",
    weight_kg: "Kg",
    seconds: "Sekunder",
  };
  const placeholders: Record<Field, string> = {
    reps: String(SUGGESTED_REPS),
    weight_kg: "Kroppsvekt",
    seconds: "",
  };
  const errorId = (field: Field) => `set-${set.id}-${field}-error`;
  const doneErrorId = `set-${set.id}-done-error`;
  // "Ferdig" points at every message shown for the row after a failed tick.
  const doneDescribedBy =
    doneError === null
      ? undefined
      : [
          ...fields.filter((field) => errors[field]).map(errorId),
          ...(doneError ? [doneErrorId] : []),
        ].join(" ") || undefined;

  return (
    <li
      data-testid="set-row"
      data-set-id={set.id}
      className={`flex flex-col gap-1 rounded-md px-2 py-1 ${set.done ? "bg-muted" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex w-16 shrink-0 items-center gap-1 text-small ${
            set.done ? "font-medium text-foreground" : "text-muted-foreground"
          }`}
        >
          {set.done ? <Check aria-hidden="true" className="size-4" /> : null}
          Sett {number}
        </span>
        {fields.map((field) => (
          <input
            key={field}
            type="text"
            inputMode={field === "weight_kg" ? "decimal" : "numeric"}
            enterKeyHint="done"
            autoComplete="off"
            aria-label={`${labels[field]}, sett ${number}, ${exerciseName}`}
            aria-invalid={errors[field] ? true : undefined}
            aria-describedby={errors[field] ? errorId(field) : undefined}
            placeholder={placeholders[field]}
            value={shown(field)}
            onChange={(event) => {
              const text = event.target.value;
              setDrafts((current) => ({ ...current, [field]: text }));
            }}
            onBlur={() => saveField(field)}
            onKeyDown={onKeyDown(field)}
            className={`${INPUT_CLASS} ${set.done ? "font-medium" : ""}`}
          />
        ))}
        <label className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={set.done}
            onChange={(event) => toggleDone(event.target.checked)}
            aria-label={`Ferdig, sett ${number}, ${exerciseName}`}
            aria-invalid={doneError !== null ? true : undefined}
            aria-describedby={doneDescribedBy}
            className="size-6 cursor-pointer accent-primary"
          />
        </label>
        <button
          type="button"
          aria-label={`Slett sett ${number}, ${exerciseName}`}
          className={ICON_BUTTON_CLASS}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="size-5" />
        </button>
      </div>
      {/* Always rendered, so a new error is read out when it appears. */}
      <div aria-live="polite">
        {fields.map((field) =>
          errors[field] ? (
            <p key={field} id={errorId(field)} className="pl-18 text-small text-destructive">
              {errors[field]}
            </p>
          ) : null,
        )}
        {doneError ? (
          <p id={doneErrorId} className="pl-18 text-small text-destructive">
            {doneError}
          </p>
        ) : null}
      </div>
    </li>
  );
}
