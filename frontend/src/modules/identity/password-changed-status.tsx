"use client";

import { useSearchParams } from "next/navigation";

import { PASSWORD_CHANGED_PARAM, PASSWORD_CHANGED_VALUE } from "./routes";

/** Status line on the login page right after a new password was set (story 1.7). */
export function PasswordChangedStatus() {
  const searchParams = useSearchParams();
  if (searchParams.get(PASSWORD_CHANGED_PARAM) !== PASSWORD_CHANGED_VALUE) return null;

  return (
    <p role="status" className="text-body font-medium text-foreground">
      Passordet er endret. Logg inn med det nye passordet.
    </p>
  );
}
