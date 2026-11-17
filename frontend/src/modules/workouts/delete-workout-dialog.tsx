"use client";

import { useEffect, useRef } from "react";

import {
  DESTRUCTIVE_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SECONDARY_DESTRUCTIVE_BUTTON_CLASS,
} from "@/modules/identity/styles";

import { useDeleteWorkout, workoutDateText, type Workout } from "./api";

const TITLE_ID = "delete-workout-title";
const TEXT_ID = "delete-workout-text";

/**
 * "Slett økt" (story 5.4) with a confirmation dialog instead of undo (FR4). The native
 * `<dialog>` opened with `showModal()` traps focus and closes on Esc; focus starts on
 * "Avbryt" and returns to the trigger. After the delete the user goes to Trening.
 */
export function DeleteWorkout({ workout }: { workout: Workout }) {
  const deletion = useDeleteWorkout();
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

  function confirm() {
    // On success the hook goes to Trening.
    deletion.mutate(workout.id);
  }

  // A failed delete: focus the alert that says why.
  useEffect(() => {
    if (deletion.isError) document.querySelector<HTMLElement>("[data-delete-workout-error]")?.focus();
  }, [deletion.isError]);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={SECONDARY_DESTRUCTIVE_BUTTON_CLASS}
      >
        Slett økt
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={TITLE_ID}
        aria-describedby={TEXT_ID}
        onClose={() => triggerRef.current?.focus()}
        onCancel={(event) => {
          // Esc: keep the dialog while the delete is being sent.
          if (deletion.isPending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)]"
      >
        <div className="flex flex-col gap-4">
          <h2 id={TITLE_ID} className="text-heading font-semibold text-foreground">
            Slette økta {workoutDateText(workout.date)}?
          </h2>
          <p id={TEXT_ID} className="text-body text-foreground">
            Øvelser og sett i økta blir slettet. Dette kan ikke angres.
          </p>
          {deletion.error ? (
            <p
              role="alert"
              tabIndex={-1}
              data-delete-workout-error
              className="text-small text-destructive focus:outline-none"
            >
              {deletion.error.message}
            </p>
          ) : null}
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
              onClick={confirm}
              disabled={deletion.isPending}
              aria-busy={deletion.isPending}
              className={DESTRUCTIVE_BUTTON_CLASS}
            >
              {deletion.isPending ? "Sletter …" : "Ja, slett"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
