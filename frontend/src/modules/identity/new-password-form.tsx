"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { ApiError, useConfirmPasswordReset } from "./api";
import { FORGOT_PASSWORD_PATH } from "./routes";
import { INPUT_CLASS, LINK_CLASS, PRIMARY_BUTTON_CLASS } from "./styles";
import { validateNewPassword } from "./validation";

export const RESET_LINK_INVALID_CODE = "reset_link_invalid";
/** Shown without asking the server when the link has no token at all. */
export const RESET_LINK_INVALID_MESSAGE = "Lenken er utløpt eller allerede brukt. Be om en ny.";

/** The invalid-link message with a way back to "Glemt passord?". */
function InvalidLink({ message }: { message: string }) {
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p className="text-body text-destructive">{message}</p>
      <p className="text-body text-foreground">
        <Link href={FORGOT_PASSWORD_PATH} className={LINK_CLASS}>
          Be om en ny lenke
        </Link>
      </p>
    </div>
  );
}

/**
 * Set a new password from the link in the reset mail (story 1.7). On success the login page
 * says the password changed; nobody is logged in.
 */
export function NewPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const confirm = useConfirmPasswordReset();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (!token) return <InvalidLink message={RESET_LINK_INVALID_MESSAGE} />;

  function showPasswordError(message: string) {
    setPasswordError(message);
    passwordRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm.isPending) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");

    setFormError(null);
    setLinkError(null);
    const clientError = validateNewPassword(password).password;
    if (clientError) {
      showPasswordError(clientError);
      return;
    }
    setPasswordError(null);

    confirm.mutate(
      { token, password },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code === RESET_LINK_INVALID_CODE) {
            setLinkError(error.message);
            return;
          }
          const field =
            error instanceof ApiError
              ? error.fields.find((item) => item.field === "password")
              : undefined;
          if (field) showPasswordError(field.message);
          else setFormError(error.message);
        },
      },
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="text-small font-medium text-foreground">
          Nytt passord
        </label>
        <input
          ref={passwordRef}
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          onChange={() => setPasswordError(null)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "new-password-error" : "new-password-hint"}
          className={INPUT_CLASS}
        />
        {passwordError ? (
          <p id="new-password-error" className="text-small text-destructive">
            {passwordError}
          </p>
        ) : (
          <p id="new-password-hint" className="text-small text-muted-foreground">
            Minst 8 tegn.
          </p>
        )}
      </div>

      {linkError && <InvalidLink message={linkError} />}
      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      <button type="submit" disabled={confirm.isPending} className={PRIMARY_BUTTON_CLASS}>
        {confirm.isPending ? "Lagrer …" : "Lagre nytt passord"}
      </button>
    </form>
  );
}
