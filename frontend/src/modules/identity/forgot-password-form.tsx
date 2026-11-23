"use client";

import { useRef, useState, type FormEvent } from "react";

import { ApiError, useRequestPasswordReset } from "./api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "./styles";
import { validateForgotPassword } from "./validation";

export const RESET_REQUESTED_MESSAGE = "Hvis e-posten har en konto, har vi sendt deg en lenke.";

/**
 * "Glemt passord?" (story 1.7): ask for a reset link. After sending, the same message is
 * shown whether or not the e-mail has an account.
 */
export function ForgotPasswordForm() {
  const request = useRequestPasswordReset();
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function showEmailError(message: string) {
    setEmailError(message);
    emailRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.isPending) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    setFormError(null);
    setSent(false);
    const clientError = validateForgotPassword(email).email;
    if (clientError) {
      showEmailError(clientError);
      return;
    }
    setEmailError(null);

    request.mutate(email, {
      onSuccess: () => setSent(true),
      onError: (error) => {
        const field =
          error instanceof ApiError ? error.fields.find((item) => item.field === "email") : undefined;
        if (field) showEmailError(field.message);
        else setFormError(error.message);
      },
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="forgot-email" className="text-small font-medium text-foreground">
          E-post
        </label>
        <input
          ref={emailRef}
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          onChange={() => setEmailError(null)}
          inputMode="email"
          spellCheck={false}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "forgot-email-error" : undefined}
          className={INPUT_CLASS}
        />
        {emailError && (
          <p id="forgot-email-error" className="text-small text-destructive">
            {emailError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      {/* Always in the DOM, so screen readers announce the text when it appears. */}
      <p role="status" className="text-body font-medium text-foreground empty:hidden">
        {sent ? RESET_REQUESTED_MESSAGE : ""}
      </p>

      <button type="submit" disabled={request.isPending} className={PRIMARY_BUTTON_CLASS}>
        {request.isPending ? "Sender lenke …" : "Send lenke"}
      </button>
    </form>
  );
}
