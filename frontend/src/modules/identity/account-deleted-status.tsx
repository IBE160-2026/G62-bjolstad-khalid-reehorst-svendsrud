"use client";

import { useSearchParams } from "next/navigation";

import { ACCOUNT_DELETED_PARAM, ACCOUNT_DELETED_VALUE } from "./routes";

/** Status line on the login page right after the account was deleted (story 1.6). */
export function AccountDeletedStatus() {
  const searchParams = useSearchParams();
  if (searchParams.get(ACCOUNT_DELETED_PARAM) !== ACCOUNT_DELETED_VALUE) return null;

  return (
    <p role="status" className="text-body font-medium text-foreground">
      Kontoen din er slettet.
    </p>
  );
}
