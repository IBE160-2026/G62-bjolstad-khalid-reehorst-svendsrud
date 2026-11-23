"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PASSWORD_CHANGED_PARAM, PASSWORD_CHANGED_VALUE } from "./routes";

/**
 * Status line on the login page right after a new password was set (story 1.7).
 *
 * The page is reached by a client-side redirect, so focus would otherwise drop to <body>.
 * The message takes focus instead: a screen reader reads it, and Tab goes on to E-post.
 */
export function PasswordChangedStatus() {
  const searchParams = useSearchParams();
  const show = searchParams.get(PASSWORD_CHANGED_PARAM) === PASSWORD_CHANGED_VALUE;
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (show) ref.current?.focus();
  }, [show]);

  if (!show) return null;

  return (
    <p
      ref={ref}
      role="status"
      tabIndex={-1}
      className="text-body font-medium text-foreground focus:outline-none"
    >
      Passordet er endret. Logg inn med det nye passordet.
    </p>
  );
}
