"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { REACTIVATED_QUERY_KEY } from "./api";

export const REACTIVATED_MESSAGE = "Velkommen tilbake! Kontoen din er aktiv igjen.";

/**
 * "Velkommen tilbake!" once, on the first signed-in page after a login that reactivated
 * the account (story 1.8). The live region is in the DOM before the text arrives, so
 * screen readers announce it politely. It sits in `AppShell` beside `IntroDialog`, so a
 * redirect between the gate and the full layout does not lose it. It stays until "Lukk".
 */
export function ReactivatedStatus() {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (queryClient.getQueryData(REACTIVATED_QUERY_KEY) !== true) return;
    // After mount, so the text lands in an existing live region and is announced.
    const timer = setTimeout(() => {
      // Read once: a later mount or the next login shows nothing.
      queryClient.removeQueries({ queryKey: REACTIVATED_QUERY_KEY, exact: true });
      setVisible(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    // Only as wide as the card, so it never covers clicks beside it.
    <div className="fixed top-[calc(var(--top-bar-height)+0.5rem)] left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div role="status" aria-live="polite">
        {visible && (
          <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card py-1 pr-1 pl-4 text-body font-medium text-foreground shadow-sheet">
            <p>{REACTIVATED_MESSAGE}</p>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                // The button unmounts; move focus to the page's main area, not <body>.
                document.getElementById("innhold")?.focus();
              }}
              className="min-h-11 shrink-0 rounded-full px-4 text-button font-medium text-accent-foreground hover:bg-muted"
            >
              Lukk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
