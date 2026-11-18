"use client";

import { useEffect, useRef } from "react";

import { useDeactivateAccount } from "./api";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./styles";

const TITLE_ID = "deactivate-account-title";
const TEXT_ID = "deactivate-account-text";

/**
 * "Deaktiver konto" on Profil with a confirmation dialog (story 1.8). Same pattern as
 * `DeleteAccount`: native `<dialog>` with `showModal()`, focus starts on "Avbryt", Esc
 * closes (not while the request is pending) and focus returns to the trigger.
 */
export function DeactivateAccount() {
  const deactivation = useDeactivateAccount();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const error = deactivation.error;

  // On error, move focus to the message so it is read and the user knows what happened.
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  function open() {
    deactivation.reset();
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={SECONDARY_BUTTON_CLASS}
      >
        Deaktiver konto
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={TITLE_ID}
        aria-describedby={TEXT_ID}
        aria-busy={deactivation.isPending || undefined}
        onClose={() => triggerRef.current?.focus()}
        onCancel={(event) => {
          if (deactivation.isPending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)]"
      >
        <div className="flex flex-col gap-4">
          <h2 id={TITLE_ID} className="text-heading font-semibold text-foreground">
            Deaktivere kontoen?
          </h2>
          <p id={TEXT_ID} className="text-body text-foreground">
            Du logges ut, og ingen data slettes. Logg inn igjen når du vil fortsette.
          </p>
          <p role="status" aria-live="polite" className="sr-only">
            {deactivation.isPending ? "Deaktiverer …" : ""}
          </p>
          {error && (
            <p ref={alertRef} role="alert" tabIndex={-1} className="text-small text-destructive">
              {error.message}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={deactivation.isPending}
              className={SECONDARY_BUTTON_CLASS}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => deactivation.mutate()}
              disabled={deactivation.isPending}
              className={PRIMARY_BUTTON_CLASS}
            >
              {deactivation.isPending ? "Deaktiverer …" : "Deaktiver"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
