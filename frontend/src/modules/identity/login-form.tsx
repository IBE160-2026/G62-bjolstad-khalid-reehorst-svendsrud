"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { ApiError, useLogin } from "./api";
import { HOME_PATH } from "./routes";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "./styles";
import {
  REGISTER_FIELDS,
  firstInvalidField,
  validateLogin,
  type FieldErrors,
  type RegisterField,
} from "./validation";

function isLoginField(field: string): field is RegisterField {
  return (REGISTER_FIELDS as readonly string[]).includes(field);
}

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
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
    if (login.isPending) return;
    const form = new FormData(event.currentTarget);
    const values = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    setFormError(null);
    const clientErrors = validateLogin(values);
    if (firstInvalidField(clientErrors)) {
      showFieldErrors(clientErrors);
      return;
    }
    setErrors({});

    login.mutate(values, {
      onSuccess: () => router.replace(HOME_PATH),
      onError: (error) => {
        // Wrong credentials and lockout are one message for the whole form (no hint
        // about which field was wrong); field errors only come from validation.
        const serverErrors: FieldErrors = {};
        if (error instanceof ApiError) {
          for (const item of error.fields) {
            if (isLoginField(item.field)) serverErrors[item.field] ??= item.message;
          }
        }
        if (firstInvalidField(serverErrors)) showFieldErrors(serverErrors);
        else setFormError(error.message);
      },
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="login-email" className="text-small font-medium text-foreground">
          E-post
        </label>
        <input
          ref={emailRef}
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          onChange={() => clearError("email")}
          inputMode="email"
          spellCheck={false}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={INPUT_CLASS}
        />
        {errors.email && (
          <p id="login-email-error" className="text-small text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="text-small font-medium text-foreground">
          Passord
        </label>
        <input
          ref={passwordRef}
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          onChange={() => clearError("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className={INPUT_CLASS}
        />
        {errors.password && (
          <p id="login-password-error" className="text-small text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      )}

      <button type="submit" disabled={login.isPending} className={PRIMARY_BUTTON_CLASS}>
        {login.isPending ? "Logger inn …" : "Logg inn"}
      </button>
    </form>
  );
}
