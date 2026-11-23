import { cleanup, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search) }));
vi.mock("@/modules/food/meals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/food/meals")>()),
  osloToday: () => "2026-11-17",
}));

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

  it("titles the exercise detail while Trening stays active", () => {
    expect(pageTitle("/trening/ovelser/abc")).toBe("Øvelse");
    expect(pageTitle("/trening/okt")).toBe("Økt");
    expect(isActive("/trening/ovelser/abc", "/trening")).toBe(true);
  });

  it("titles the account pages without adding them to the navigation", () => {
    expect(pageTitle("/opprett-konto")).toBe("Opprett konto");
    expect(pageTitle("/samtykke")).toBe("Samtykke");
    expect(pageTitle("/profiloppsett")).toBe("Profiloppsett");
    expect(pageTitle("/logg-inn")).toBe("Logg inn");
    expect(pageTitle("/glemt-passord")).toBe("Glemt passord");
    expect(pageTitle("/nytt-passord")).toBe("Nytt passord");
    expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/opprett-konto");
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

describe("dated links (story 6.3)", () => {
  it("Mat and Trening keep a valid ?dato=; I dag and the others do not", () => {
    navigation.pathname = "/mat";
    navigation.search = "dato=2026-11-16";
    render(<Sidebar />);
    const nav = screen.getByRole("navigation", { name: "Hovedmeny" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/",
      "/mat?dato=2026-11-16",
      "/trening?dato=2026-11-16",
      "/historikk",
      "/profil",
    ]);
    cleanup();
    // A future or malformed date is not passed on.
    for (const search of ["dato=2999-01-01", "dato=2026-02-30"]) {
      navigation.search = search;
      render(<Sidebar />);
      const links = within(screen.getByRole("navigation", { name: "Hovedmeny" })).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toContain("/mat");
      cleanup();
    }
    navigation.search = "";
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
