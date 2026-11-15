/**
 * Light/dark theme (NFR-12). Light is the default regardless of OS setting.
 * The choice lives in localStorage under `pf-theme` and is applied as
 * `data-theme` on <html>. Storage may be blocked; every access is guarded so the
 * toggle still works for the session.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pf-theme";
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** Stored theme, or light when missing, invalid or unreadable. */
export function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Persist the theme. Returns false when storage is unavailable. */
export function storeTheme(theme: Theme): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}

/** Theme currently applied to the document (the source of truth for the session). */
export function readAppliedTheme(root: HTMLElement = document.documentElement): Theme {
  const value = root.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Inline script for <head>: applies the stored theme before first paint.
 * Kept in sync with readStoredTheme/applyTheme by the tests.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;
