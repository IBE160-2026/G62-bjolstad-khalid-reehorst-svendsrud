"use client";

import { useRef } from "react";

import { useDeleteAccount } from "./api";
import { DESTRUCTIVE_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./styles";

const TITLE_ID = "delete-account-title";
const TEXT_ID = "delete-account-text";

/**
 * "Slett konto" on Profil with a confirmation dialog (story 1.6). The native `<dialog>`
 * opened with `showModal()` traps focus and closes on Esc; focus returns to the trigger.
 */
export function DeleteAccount() {
  const deletion = useDeleteAccount();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  function open() {
    deletion.reset();
    dialogRef.current?.showModal();
    // Start on the safe choice.
    cancelRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleClose() {
    triggerRef.current?.focus();
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
        Slett konto
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={TITLE_ID}
        aria-describedby={TEXT_ID}
        onClose={handleClose}
        onCancel={(event) => {
          // Esc: keep the dialog while the deletion is being sent.
          if (deletion.isPending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)]"
      >
        <div className="flex flex-col gap-4">
          <h2 id={TITLE_ID} className="text-heading font-semibold text-foreground">
            Slette kontoen?
          </h2>
          <p id={TEXT_ID} className="text-body text-foreground">
            Profilen, maten og treningsøktene dine slettes. Dette kan ikke angres.
          </p>
          {deletion.error && (
            <p role="alert" className="text-small text-destructive">
              {deletion.error.message}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={close}
              disabled={deletion.isPending}
              className={SECONDARY_BUTTON_CLASS}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => deletion.mutate()}
              disabled={deletion.isPending}
              className={DESTRUCTIVE_BUTTON_CLASS}
            >
              {deletion.isPending ? "Sletter …" : "Slett konto"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
