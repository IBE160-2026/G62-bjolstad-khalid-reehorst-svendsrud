"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { ApiError, useRegister } from "./api";
import { CONSENT_PATH } from "./routes";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "./styles";
import {
  REGISTER_FIELDS,
  firstInvalidField,
  validateRegister,
  type FieldErrors,
  type RegisterField,
} from "./validation";

function isRegisterField(field: string): field is RegisterField {
  return (REGISTER_FIELDS as readonly string[]).includes(field);
}

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function showFieldErrors(next: FieldErrors) {
    setErrors(next);
    const first = firstInvalidField(next);
    const input = first === "email" ? emailRef.current : first === "password" ? passwordRef.current : null;
    input?.focus();
  }

  function clearError(field: RegisterField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (register.isPending) return;
    const form = new FormData(event.currentTarget);
    const values = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    setFormError(null);
    const clientErrors = validateRegister(values);
    if (firstInvalidField(clientErrors)) {
      showFieldErrors(clientErrors);
      return;
    }
    setErrors({});

    register.mutate(values, {
      onSuccess: () => router.push(CONSENT_PATH),
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          setFormError(error.message);
          return;
        }
        const serverErrors: FieldErrors = {};
        for (const item of error.fields) {
          if (isRegisterField(item.field)) serverErrors[item.field] ??= item.message;
        }
        if (error.code === "email_unavailable") serverErrors.email = error.message;
        if (firstInvalidField(serverErrors)) showFieldErrors(serverErrors);
        else setFormError(error.message);
      },
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="register-email" className="text-small font-medium text-foreground">
          E-post
        </label>
        <input
          ref={emailRef}
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          onChange={() => clearError("email")}
          inputMode="email"
          spellCheck={false}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className={INPUT_CLASS}
        />
        {errors.email && (
          <p id="register-email-error" className="text-small text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="register-password" className="text-small font-medium text-foreground">
          Passord
        </label>
        <input
          ref={passwordRef}
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          onChange={() => clearError("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={
            errors.password ? "register-password-error" : "register-password-hint"
          }
          className={INPUT_CLASS}
        />
        {errors.password ? (
          <p id="register-password-error" className="text-small text-destructive">
            {errors.password}
          </p>
        ) : (
          <p id="register-password-hint" className="text-small text-muted-foreground">
            Minst 8 tegn.
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={register.isPending}
        className={PRIMARY_BUTTON_CLASS}
      >
        {register.isPending ? "Oppretter konto …" : "Opprett konto"}
      </button>
    </form>
  );
}
