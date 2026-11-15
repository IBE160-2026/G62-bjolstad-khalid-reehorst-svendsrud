import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { NAV_ITEMS, isActive, pageTitle } from "./nav-items";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";

beforeEach(() => {
  navigation.pathname = "/";
});

describe("nav items", () => {
  it("has the five sections in order", () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href])).toEqual([
      ["I dag", "/"],
      ["Mat", "/mat"],
      ["Trening", "/trening"],
      ["Historikk", "/historikk"],
      ["Profil", "/profil"],
    ]);
  });

  it("matches the active route and nested routes", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/mat", "/")).toBe(false);
    expect(isActive("/mat/sok", "/mat")).toBe(true);
    expect(isActive("/matlaging", "/mat")).toBe(false);
    expect(pageTitle("/trening")).toBe("Trening");
    expect(pageTitle("/ukjent")).toBe("Prompt Force");
  });
});

describe("Sidebar", () => {
  it("renders five named links and marks the current page", () => {
    navigation.pathname = "/trening";
    render(<Sidebar />);
    const nav = screen.getByRole("navigation", { name: "Hovedmeny" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "I dag",
      "Mat",
      "Trening",
      "Historikk",
      "Profil",
    ]);
    expect(within(nav).getByRole("link", { name: "Trening" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});

describe("TabBar", () => {
  it("shows I dag, Mat, Trening and Profil with I dag active on /", () => {
    render(<TabBar />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["I dag", "Mat", "Trening", "Profil"]);
    expect(screen.getByRole("link", { name: "I dag" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mat" })).not.toHaveAttribute("aria-current");
  });
});
