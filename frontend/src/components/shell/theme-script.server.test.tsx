// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

import { ThemeScript } from "./theme-toggle";

describe("ThemeScript (server render)", () => {
  it("emits an executable inline script with the bootstrap code", () => {
    const html = renderToStaticMarkup(<ThemeScript />);
    expect(html).toContain('type="text/javascript"');
    expect(html).toContain(THEME_BOOTSTRAP_SCRIPT);
  });
});
