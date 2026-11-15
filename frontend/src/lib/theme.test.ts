import { afterEach, describe, expect, it, vi } from "vitest";

import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  readAppliedTheme,
  readStoredTheme,
  storeTheme,
} from "./theme";

function runBootstrap() {
  new Function(THEME_BOOTSTRAP_SCRIPT)();
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("theme", () => {
  it("defaults to light on first visit", () => {
    expect(readStoredTheme()).toBe("light");
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applies a stored dark theme before paint", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readStoredTheme()).toBe("dark");
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to light for an invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(readStoredTheme()).toBe("light");
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredTheme()).toBe("light");
    expect(storeTheme("dark")).toBe(false);
    expect(() => runBootstrap()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("stores, applies and toggles", () => {
    expect(storeTheme("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    applyTheme("dark");
    expect(readAppliedTheme()).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
