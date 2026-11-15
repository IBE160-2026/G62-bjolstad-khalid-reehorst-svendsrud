/** Routes and cookie name the logged-out/logged-in routing depends on (stories 1.4, 1.5). */

export const SESSION_COOKIE = "pf_session";
export const LOGIN_PATH = "/logg-inn";
export const REGISTER_PATH = "/opprett-konto";
export const CONSENT_PATH = "/samtykke";
export const HOME_PATH = "/";

/** The only pages a logged-out visitor can reach; logged-in users are sent to `/`. */
export const AUTH_PATHS: readonly string[] = [LOGIN_PATH, REGISTER_PATH];

/**
 * Logged-in steps before the app itself: the minimal layout (no navigation), but the
 * session is still checked by `SessionGuard`.
 */
export const GATE_PATHS: readonly string[] = [CONSENT_PATH];

function matches(paths: readonly string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isAuthPath(pathname: string): boolean {
  return matches(AUTH_PATHS, pathname);
}

export function isGatePath(pathname: string): boolean {
  return matches(GATE_PATHS, pathname);
}

export function isConsentPath(pathname: string): boolean {
  return matches([CONSENT_PATH], pathname);
}
