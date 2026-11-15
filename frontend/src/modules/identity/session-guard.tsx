"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ApiError, useMe } from "./api";
import { CONSENT_PATH, HOME_PATH, LOGIN_PATH, isConsentPath } from "./routes";

/** Where the current user should be instead of `pathname`, or null to stay. */
export function guardRedirect(
  pathname: string,
  unauthorized: boolean,
  consentAt: string | null | undefined,
): string | null {
  if (unauthorized) return LOGIN_PATH;
  // Unknown user (still loading or a network error): stay put.
  if (consentAt === undefined) return null;
  const onConsent = isConsentPath(pathname);
  if (consentAt === null && !onConsent) return CONSENT_PATH;
  if (consentAt !== null && onConsent) return HOME_PATH;
  return null;
}

/**
 * Asks the backend who is logged in. The proxy only sees that a cookie exists; when the
 * backend says the session is gone (401, cookie already cleared), go to the login page.
 * A user who has not given consent is kept on `/samtykke`; one who has is sent on from it.
 */
export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  // Ignore an old 401 while it is being refetched (e.g. right after a new login).
  const unauthorized =
    !me.isFetching && me.error instanceof ApiError && me.error.code === "unauthorized";
  const target = guardRedirect(pathname, unauthorized, me.data?.consent_at);

  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  return null;
}
