"use client";

import { useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import {
  INPUT_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/modules/identity/styles";

import { useLookupBarcode, type FoodItem } from "./api";
import { OWN_FOOD_MESSAGES, isValidEan, normalizeBarcode } from "./meals";

export const BARCODE_INPUT_ID = "barcode-input";
const BARCODE_ERROR_ID = "barcode-input-error";

/** Errors after which the user is offered to register the item with the barcode. */
const REGISTER_CODES = new Set(["barcode_not_found", "off_unavailable"]);

/**
 * "Skriv strekkode" (story 3.3): the code is checked (EAN-8/13) and looked up only when the
 * form is submitted, never while typing. A found item goes to the amount picker; not
 * found, no kcal or Open Food Facts unreachable offers "Registrer selv" with the code.
 */
export function BarcodePanel({
  labelledBy,
  panelId,
  text,
  setText,
  onFound,
  onRegister,
}: {
  labelledBy: string;
  panelId: string;
  text: string;
  setText: (text: string) => void;
  onFound: (item: FoodItem) => void;
  onRegister: (barcode: string) => void;
}) {
  const lookup = useLookupBarcode();
  const [fieldError, setFieldError] = useState<string>();
  // Not found / unavailable: the message plus "Registrer selv" for this code.
  const [missing, setMissing] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function showFieldError(message: string) {
    setFieldError(message);
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (lookup.isPending) return;
    setMissing(null);
    setFormError(null);
    const code = normalizeBarcode(text);
    if (!isValidEan(code)) {
      showFieldError(OWN_FOOD_MESSAGES.barcode);
      return;
    }
    lookup.mutate(code, {
      onSuccess: onFound,
      onError: (error) => {
        const apiCode = error instanceof ApiError ? error.code : "";
        if (apiCode === "invalid_barcode") showFieldError(error.message);
        else if (REGISTER_CODES.has(apiCode))
          setMissing({ code, message: error.message });
        else setFormError(error.message);
      },
    });
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-4"
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        aria-label="Finn vare med strekkode"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor={BARCODE_INPUT_ID}
            className="text-small font-medium text-foreground"
          >
            Strekkode
          </label>
          <input
            id={BARCODE_INPUT_ID}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            autoFocus
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFieldError(undefined);
              setMissing(null);
              setFormError(null);
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? BARCODE_ERROR_ID : undefined}
            className={`${INPUT_CLASS} tabular-nums`}
          />
          {fieldError ? (
            <p id={BARCODE_ERROR_ID} className="text-small text-destructive">
              {fieldError}
            </p>
          ) : (
            <p className="text-small text-muted-foreground">
              Tallene under strekene på pakken, 8 eller 13 siffer.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={lookup.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {lookup.isPending ? "Leter …" : "Finn varen"}
        </button>
      </form>

      {missing && (
        <div role="status" className="flex flex-col gap-1">
          <p className="text-body text-foreground">{missing.message}</p>
          <p>
            <button
              type="button"
              onClick={() => onRegister(missing.code)}
              className={`${LINK_CLASS} text-small`}
            >
              Registrer selv
            </button>
          </p>
        </div>
      )}
      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}
    </div>
  );
}
