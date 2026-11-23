/** Routes and cookie name the logged-out/logged-in routing depends on (stories 1.4–1.6). */

export const SESSION_COOKIE = "pf_session";
export const LOGIN_PATH = "/logg-inn";
export const REGISTER_PATH = "/opprett-konto";
export const CONSENT_PATH = "/samtykke";
/** Profile setup (story 2.1): where a consented user without a profile is sent. */
export const PROFILE_SETUP_PATH = "/profiloppsett";
export const HOME_PATH = "/";
/** Forgotten password (story 1.7): request a link, then set a new password from it. */
export const FORGOT_PASSWORD_PATH = "/glemt-passord";
export const NEW_PASSWORD_PATH = "/nytt-passord";

/** Where a user lands after deleting the account; the login page shows a status line. */
export const ACCOUNT_DELETED_PARAM = "konto";
export const ACCOUNT_DELETED_VALUE = "slettet";
export const ACCOUNT_DELETED_PATH = `${LOGIN_PATH}?${ACCOUNT_DELETED_PARAM}=${ACCOUNT_DELETED_VALUE}`;

/** Where a user lands after setting a new password; the login page shows a status line. */
export const PASSWORD_CHANGED_PARAM = "passord";
export const PASSWORD_CHANGED_VALUE = "endret";
export const PASSWORD_CHANGED_PATH = `${LOGIN_PATH}?${PASSWORD_CHANGED_PARAM}=${PASSWORD_CHANGED_VALUE}`;

/** The only pages a logged-out visitor can reach; logged-in users are sent to `/`. */
export const AUTH_PATHS: readonly string[] = [
  LOGIN_PATH,
  REGISTER_PATH,
  FORGOT_PASSWORD_PATH,
  NEW_PASSWORD_PATH,
];

/**
 * Logged-in steps before the app itself: the minimal layout (no navigation), but the
 * session is still checked by `SessionGuard`.
 */
export const GATE_PATHS: readonly string[] = [CONSENT_PATH, PROFILE_SETUP_PATH];

function matches(paths: readonly string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Auth pages the proxy never redirects, with or without a session cookie: the reset link
 * (story 1.7) must keep its token even in a browser that still holds a (stale) cookie.
 */
export const ALWAYS_OPEN_PATHS: readonly string[] = [NEW_PASSWORD_PATH];

export function isAlwaysOpenPath(pathname: string): boolean {
  return matches(ALWAYS_OPEN_PATHS, pathname);
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

export function isProfileSetupPath(pathname: string): boolean {
  return matches([PROFILE_SETUP_PATH], pathname);
}
