"use client";

import { CircleQuestionMark } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";

import { SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { helpFor } from "./help-texts";

/**
 * "?" in the top bar (story 6.4, UX-DR15): a native `<dialog>` opened with `showModal()`
 * that explains the current page. Focus moves to "Lukk"; Esc or "Lukk" closes and focus
 * goes back to "?".
 */
export function HelpButton() {
  const pathname = usePathname();
  const help = helpFor(pathname);
  const titleId = useId();
  const textId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A new page means new help: never leave the old page's text open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, [pathname]);

  function open() {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-label="Hjelp for denne siden"
        aria-haspopup="dialog"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <CircleQuestionMark aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)]"
      >
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-heading font-semibold text-foreground">
            {help.page ? `Hjelp: ${help.page}` : "Hjelp"}
          </h2>
          <p id={textId} className="text-body text-foreground">
            {help.text}
          </p>
          <div className="flex justify-end">
            <button ref={closeRef} type="button" onClick={close} className={SECONDARY_BUTTON_CLASS}>
              Lukk
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
