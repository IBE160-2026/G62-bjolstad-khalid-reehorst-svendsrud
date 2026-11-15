"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ApiError, useMe } from "./api";
import { LOGIN_PATH } from "./routes";

/**
 * Asks the backend who is logged in. The proxy only sees that a cookie exists; when the
 * backend says the session is gone (401, cookie already cleared), go to the login page.
 */
export function SessionGuard() {
  const router = useRouter();
  const me = useMe();
  // Ignore an old 401 while it is being refetched (e.g. right after a new login).
  const unauthorized =
    !me.isFetching && me.error instanceof ApiError && me.error.code === "unauthorized";

  useEffect(() => {
    if (unauthorized) router.replace(LOGIN_PATH);
  }, [unauthorized, router]);

  return null;
}
