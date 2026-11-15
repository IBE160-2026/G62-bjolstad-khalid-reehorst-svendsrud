// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { authRedirect, config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

describe("authRedirect", () => {
  it.each(["/", "/mat", "/trening", "/historikk", "/profil", "/samtykke", "/mat/sok"])(
    "sends a visitor without a cookie from %s to /logg-inn",
    (path) => expect(authRedirect(path, false)).toBe("/logg-inn"),
  );

  it.each(["/logg-inn", "/opprett-konto"])("lets a visitor without a cookie open %s", (path) =>
    expect(authRedirect(path, false)).toBeNull(),
  );

  it.each(["/logg-inn", "/opprett-konto"])("sends a user with a cookie from %s to /", (path) =>
    expect(authRedirect(path, true)).toBe("/"),
  );

  it.each(["/", "/mat", "/profil", "/samtykke"])("lets a user with a cookie open %s", (path) =>
    expect(authRedirect(path, true)).toBeNull(),
  );

  it("does not treat look-alike paths as auth pages", () => {
    expect(authRedirect("/logg-inn-hjelp", false)).toBe("/logg-inn");
  });
});

describe("proxy", () => {
  it("redirects to /logg-inn without a session cookie", () => {
    const response = proxy(request("/mat"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/logg-inn");
  });

  it("treats an empty cookie as no cookie", () => {
    const response = proxy(request("/", "pf_session="));
    expect(response.headers.get("location")).toBe("http://localhost:3000/logg-inn");
  });

  it("redirects a logged-in user away from the login page", () => {
    const response = proxy(request("/logg-inn", "pf_session=abc"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("lets a request with a cookie through", () => {
    const response = proxy(request("/profil", "pf_session=abc"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("skips the API, Next internals and static files", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/mat")).toBe(true);
    expect(matcher.test("/logg-inn")).toBe(true);
    expect(matcher.test("/api/identity/me")).toBe(false);
    expect(matcher.test("/api")).toBe(false);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    expect(matcher.test("/apiary")).toBe(true);
  });
});
