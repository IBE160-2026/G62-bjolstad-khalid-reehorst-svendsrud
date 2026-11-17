import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import {
  expectOpenerSheetFocusCycle,
  expectOpenerSheetFocusCycleWithoutFocus,
  installDialogPolyfill,
} from "@/test/sheet-a11y";

import { AppShell } from "./app-shell";
import { FALLBACK_HELP_TEXT, helpFor } from "./help-texts";
import { pageTitle } from "./nav-items";

beforeAll(installDialogPolyfill);

afterEach(() => {
  getMock.mockReset();
});

let rerender: () => void = () => {};

function renderShell(pathname: string) {
  navigation.pathname = pathname;
  // Never answers: the session check stays pending, so no redirect or intro gets in the way.
  getMock.mockReturnValue(new Promise(() => {}));
  const client = new QueryClient();
  const tree = () => (
    <QueryClientProvider client={client}>
      <AppShell>
        <p>Innhold</p>
      </AppShell>
    </QueryClientProvider>
  );
  const result = render(tree());
  rerender = () => result.rerender(tree());
}

function helpButton() {
  return screen.getByRole("button", { name: "Hjelp for denne siden" });
}

describe("help button (story 6.4)", () => {
  it("opens 'Hjelp: Økt' with the Økt text on a workout page", () => {
    renderShell("/trening/okt/123");

    fireEvent.click(helpButton());

    const dialog = screen.getByRole("dialog", { name: "Hjelp: Økt" });
    expect(dialog).toHaveAccessibleDescription(
      "Her logger du økta. Fyll inn repetisjoner og kg for hvert sett og huk av når settet er ferdig. «Sist» viser hva du gjorde forrige gang. Trykk «Fullfør økt» når du er ferdig.",
    );
    expect(within(dialog).getByRole("button", { name: "Lukk" })).toHaveFocus();
  });

  it("Esc closes the sheet and focus goes back to '?'", async () => {
    renderShell("/mat");

    await expectOpenerSheetFocusCycle(helpButton(), () =>
      screen.getByRole("dialog", { name: "Hjelp: Mat" }),
    );
  });

  it("gives focus back to '?' even when the click did not focus it", async () => {
    renderShell("/trening");

    await expectOpenerSheetFocusCycleWithoutFocus(helpButton(), () =>
      screen.getByRole("dialog", { name: "Hjelp: Trening" }),
    );
  });

  it("closes the sheet when the page changes", () => {
    renderShell("/mat");
    fireEvent.click(helpButton());
    const dialog = screen.getByRole("dialog", { name: "Hjelp: Mat" });

    navigation.pathname = "/trening";
    rerender();

    expect(dialog).not.toHaveAttribute("open");
  });

  it("has no tooltip and is titled just 'Hjelp' on a page without its own text", () => {
    renderShell("/noe-annet");
    expect(helpButton()).not.toHaveAttribute("title");

    fireEvent.click(helpButton());

    expect(screen.getByRole("dialog", { name: "Hjelp" })).toHaveAccessibleDescription(
      FALLBACK_HELP_TEXT,
    );
  });

  it("Lukk closes the sheet and focus goes back to '?'", () => {
    renderShell("/");
    const button = helpButton();
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole("dialog", { name: "Hjelp: I dag" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Lukk" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(button).toHaveFocus();
  });

  it("is a 44 px icon button", () => {
    renderShell("/profil");

    expect(helpButton()).toHaveClass("size-11");
    expect(helpButton().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it.each(["/logg-inn", "/opprett-konto", "/samtykke", "/profiloppsett"])(
    "is not shown on %s",
    (pathname) => {
      renderShell(pathname);

      expect(
        screen.queryByRole("button", { name: "Hjelp for denne siden" }),
      ).not.toBeInTheDocument();
    },
  );
});

describe("helpFor", () => {
  it.each([
    ["/", "I dag", "Her ser du dagen din"],
    ["/mat", "Mat", "Her logger du det du spiser"],
    ["/trening", "Trening", "Her finner du øvelser"],
    ["/trening/okt", "Økt", "Her logger du økta"],
    ["/trening/okt/123", "Økt", "Her logger du økta"],
    ["/trening/ovelser/abc", "Øvelse", "Her ser du hvordan du gjør øvelsen"],
    ["/profil", "Profil", "Her endrer du kroppsdata"],
    ["/historikk", "Historikk", "Her kommer en oversikt"],
    ["/trening/ovelser", "Øvelse", "Her ser du hvordan du gjør øvelsen"],
  ])("%s gives %s, the same as the top-bar title", (pathname, page, start) => {
    const help = helpFor(pathname);

    expect(help.page).toBe(page);
    expect(help.page).toBe(pageTitle(pathname));
    expect(help.text.startsWith(start)).toBe(true);
  });

  it.each(["/noe-annet", "/matvarer", "/profiler"])(
    "falls back to the menu text on %s",
    (pathname) => {
      expect(helpFor(pathname)).toEqual({ page: null, text: FALLBACK_HELP_TEXT });
    },
  );
});
