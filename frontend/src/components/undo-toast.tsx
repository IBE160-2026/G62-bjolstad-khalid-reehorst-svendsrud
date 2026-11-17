"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const UNDO_TOAST_MS = 5000;

export type UndoToastState = {
  /** New for every delete, so a second delete restarts the 5 s. */
  key: number;
  name: string;
};

/**
 * "{Navn} er slettet." with "Angre" (stories 3.6, 5.2), at the bottom above the tab bar and
 * away from the page's primary button. The live region is always rendered so screen
 * readers pick up each new message. It goes away after 5 s or once "Angre" has restored
 * what was deleted; a failed undo shows `error`.
 *
 * The 5 s only run while the toast can be used (WCAG 2.2.1): they pause while it is
 * hovered or focused, while `paused` (e.g. a sheet makes the page inert) and while
 * `restoring`. "Angre" stays in place (showing "Henter tilbake …") until the restore ends.
 */
export function UndoToast({
  toast,
  restoring,
  announcement,
  paused,
  error,
  onUndo,
  onTimeout,
  onDismissError,
}: {
  toast: UndoToastState | null;
  restoring: boolean;
  /** Read out in the status region when there is no toast, e.g. "{Navn} er tilbake." */
  announcement: string | null;
  paused: boolean;
  error: string | null;
  onUndo: () => void;
  onTimeout: () => void;
  onDismissError: () => void;
}) {
  // The latest callback without restarting the timer on every render.
  const timeoutRef = useRef(onTimeout);
  useEffect(() => {
    timeoutRef.current = onTimeout;
  });

  const key = toast?.key;
  // Keyed to the toast, so a new toast never inherits the previous one's hover or focus.
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);
  const [focusedKey, setFocusedKey] = useState<number | null>(null);
  const running =
    key !== undefined &&
    !paused &&
    !restoring &&
    hoveredKey !== key &&
    focusedKey !== key;

  // Time left for the current toast; reset when a new toast arrives.
  const remainingRef = useRef(UNDO_TOAST_MS);
  const timedKeyRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timedKeyRef.current !== key) {
      timedKeyRef.current = key;
      remainingRef.current = UNDO_TOAST_MS;
    }
    if (!running) return;
    const started = Date.now();
    const timer = setTimeout(
      () => timeoutRef.current(),
      remainingRef.current,
    );
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - started;
    };
  }, [key, running]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+1rem)] z-30 flex flex-col items-center gap-2 px-margin-mobile md:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="flex w-full justify-center"
      >
        {toast ? (
          <div
            data-testid="undo-toast"
            onPointerEnter={() => setHoveredKey(toast.key)}
            onPointerLeave={() => setHoveredKey(null)}
            onFocus={() => setFocusedKey(toast.key)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setFocusedKey(null);
            }}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card py-1 pr-1 pl-4 text-body text-foreground shadow-sheet"
          >
            <p>{restoring ? "Henter tilbake …" : `${toast.name} er slettet.`}</p>
            <button
              type="button"
              // Not `disabled`: that would drop focus while the restore is in flight.
              aria-disabled={restoring || undefined}
              onClick={() => {
                if (!restoring) onUndo();
              }}
              className="min-h-11 shrink-0 rounded-full px-4 text-button font-medium text-accent-foreground hover:bg-muted aria-disabled:opacity-70"
            >
              Angre
            </button>
          </div>
        ) : (
          announcement && <p className="sr-only">{announcement}</p>
        )}
      </div>
      {error && (
        <div
          role="alert"
          data-undo-error
          // Focusable, so a page can move focus here after a failed "Angre".
          tabIndex={-1}
          className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card py-1 pr-1 pl-4 text-body text-destructive shadow-sheet"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Lukk"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
