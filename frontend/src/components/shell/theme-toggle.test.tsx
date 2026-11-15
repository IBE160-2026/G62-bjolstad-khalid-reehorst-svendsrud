import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";

import { ThemeToggle } from "./theme-toggle";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle", () => {
  it("starts in light mode and offers dark mode", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Bytt til mørk modus" })).toBeInTheDocument();
  });

  it("switches data-theme without reload and persists the choice", () => {
    render(<ThemeToggle />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Bytt til mørk modus" }));
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Bytt til lys modus" })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Bytt til lys modus" }));
    });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("restores a stored dark theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Bytt til lys modus" })).toBeInTheDocument();
  });

  it("still toggles for the session when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeToggle />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Bytt til mørk modus" }));
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Bytt til lys modus" })).toBeInTheDocument();
  });
});
