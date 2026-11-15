/** Routes and cookie name the logged-out/logged-in routing depends on (story 1.4). */

export const SESSION_COOKIE = "pf_session";
export const LOGIN_PATH = "/logg-inn";
export const REGISTER_PATH = "/opprett-konto";
export const HOME_PATH = "/";

/** The only pages a logged-out visitor can reach; logged-in users are sent to `/`. */
export const AUTH_PATHS: readonly string[] = [LOGIN_PATH, REGISTER_PATH];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
