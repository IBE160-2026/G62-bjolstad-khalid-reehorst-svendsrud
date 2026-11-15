/**
 * Client-side checks for the registration and login forms. They mirror the backend rules in
 * `backend/app/modules/identity/schemas.py`; the backend stays the source of truth.
 */

export type RegisterField = "email" | "password";
export type RegisterValues = Record<RegisterField, string>;
export type FieldErrors = Partial<Record<RegisterField, string>>;

/** Order used to pick the first invalid field to focus. */
export const REGISTER_FIELDS: readonly RegisterField[] = ["email", "password"];

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const MESSAGES = {
  emailMissing: "Skriv inn e-postadressen din.",
  emailInvalid: "Skriv inn en gyldig e-postadresse.",
  passwordTooShort: "Velg et passord på minst 8 tegn.",
  passwordTooLong: "Velg et passord på høyst 128 tegn.",
  passwordMissing: "Skriv inn passordet ditt.",
} as const;

/** One @, a non-empty local part, a domain with a dot, at most 254 characters. */
export function isValidEmail(email: string): boolean {
  if (email.length > EMAIL_MAX_LENGTH || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  const labels = domain.split(".");
  return local.length > 0 && labels.length > 1 && labels.every((label) => label.length > 0);
}

function emailError(value: string): string | undefined {
  const email = value.trim().toLowerCase();
  if (!email) return MESSAGES.emailMissing;
  if (!isValidEmail(email)) return MESSAGES.emailInvalid;
  return undefined;
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  const email = emailError(values.email);
  if (email) errors.email = email;

  // Count characters like the backend (Python len), not UTF-16 code units.
  const passwordLength = Array.from(values.password).length;
  if (passwordLength < PASSWORD_MIN_LENGTH) errors.password = MESSAGES.passwordTooShort;
  else if (passwordLength > PASSWORD_MAX_LENGTH) errors.password = MESSAGES.passwordTooLong;

  return errors;
}

/** Login only checks that both fields are filled in; the password rules are not hinted at. */
export function validateLogin(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  const email = emailError(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = MESSAGES.passwordMissing;
  return errors;
}

export function firstInvalidField(errors: FieldErrors): RegisterField | undefined {
  return REGISTER_FIELDS.find((field) => errors[field]);
}
