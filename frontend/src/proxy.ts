import { NextResponse, type NextRequest } from "next/server";

import {
  HOME_PATH,
  LOGIN_PATH,
  SESSION_COOKIE,
  isAlwaysOpenPath,
  isAuthPath,
} from "@/modules/identity/routes";

/**
 * Optimistic routing on the cookie's presence only (story 1.4). The backend stays the
 * authority: a stale cookie gets through here, then `/api/identity/me` answers 401,
 * clears the cookie and the client goes to the login page.
 *
 * Returns the path to redirect to, or null to let the request through.
 */
export function authRedirect(pathname: string, hasSessionCookie: boolean): string | null {
  if (isAlwaysOpenPath(pathname)) return null;
  const authPage = isAuthPath(pathname);
  if (!hasSessionCookie && !authPage) return LOGIN_PATH;
  if (hasSessionCookie && authPage) return HOME_PATH;
  return null;
}

export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const target = authRedirect(request.nextUrl.pathname, hasSessionCookie);
  if (target === null) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  // Everything except the API rewrite, Next internals and files with an extension.
  matcher: ["/((?!api(?:/|$)|_next/|.*\\..*).*)"],
};
