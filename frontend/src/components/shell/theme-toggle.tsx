"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  DEFAULT_THEME,
  THEME_BOOTSTRAP_SCRIPT,
  applyTheme,
  nextTheme,
  readAppliedTheme,
  readStoredTheme,
  storeTheme,
} from "@/lib/theme";

// Notify every mounted toggle when the applied theme changes.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Inline <head> script that applies the stored theme before first paint.
 * Rendered as text/plain on the client so React does not warn about script tags;
 * the server HTML keeps text/javascript, which is what the browser runs.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
    />
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, () => readAppliedTheme(), () => DEFAULT_THEME);

  // React's dev Strict Mode remount resets <html> attributes; re-apply before paint.
  useLayoutEffect(() => {
    if (!document.documentElement.dataset.theme) {
      applyTheme(readStoredTheme());
      notify();
    }
  }, []);

  const label = theme === "dark" ? "Bytt til lys modus" : "Bytt til mørk modus";
  const Icon = theme === "dark" ? Sun : Moon;

  function toggle() {
    const next = nextTheme(readAppliedTheme());
    applyTheme(next);
    storeTheme(next); // May fail when storage is blocked; the session still switches.
    notify();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
    </button>
  );
}
