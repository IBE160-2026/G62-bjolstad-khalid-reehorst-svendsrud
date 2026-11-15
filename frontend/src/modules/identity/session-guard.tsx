"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { isProfileMissing, useProfile } from "@/modules/profile/api";

import { ApiError, useMe } from "./api";
import {
  CONSENT_PATH,
  HOME_PATH,
  LOGIN_PATH,
  PROFILE_SETUP_PATH,
  isConsentPath,
  isProfileSetupPath,
} from "./routes";

/**
 * Where the current user should be instead of `pathname`, or null to stay.
 * Order: no session → login, no consent → consent, no profile → profile setup.
 * `hasProfile` is undefined while unknown (loading, error, or no consent yet).
 */
export function guardRedirect(
  pathname: string,
  unauthorized: boolean,
  consentAt: string | null | undefined,
  hasProfile?: boolean,
): string | null {
  if (unauthorized) return LOGIN_PATH;
  // Unknown user (still loading or a network error): stay put.
  if (consentAt === undefined) return null;
  const onConsent = isConsentPath(pathname);
  if (consentAt === null) return onConsent ? null : CONSENT_PATH;
  if (onConsent) {
    // Wait for the profile answer, so the user is not sent through I dag first.
    if (hasProfile === undefined) return null;
    return hasProfile ? HOME_PATH : PROFILE_SETUP_PATH;
  }
  // A user with a profile may stay on profile setup: it shows the saved target.
  if (hasProfile === false && !isProfileSetupPath(pathname)) return PROFILE_SETUP_PATH;
  return null;
}

/**
 * Asks the backend who is logged in. The proxy only sees that a cookie exists; when the
 * backend says the session is gone (401, cookie already cleared), go to the login page.
 * A user who has not given consent is kept on `/samtykke`; one who has is sent on from it,
 * and one without a profile is sent to `/profiloppsett`.
 */
export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const consentAt = me.data?.consent_at;
  // The profile endpoints require consent, so only ask once it is given.
  const profile = useProfile({ enabled: typeof consentAt === "string" });
  // Ignore an old 401 while it is being refetched (e.g. right after a new login).
  const unauthorized =
    !me.isFetching && me.error instanceof ApiError && me.error.code === "unauthorized";
  const hasProfile = profile.data
    ? true
    : !profile.isFetching && isProfileMissing(profile.error)
      ? false
      : undefined;
  const target = guardRedirect(pathname, unauthorized, consentAt, hasProfile);

  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  return null;
}
