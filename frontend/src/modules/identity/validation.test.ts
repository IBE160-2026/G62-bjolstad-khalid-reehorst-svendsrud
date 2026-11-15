import { describe, expect, it } from "vitest";

import { MESSAGES, firstInvalidField, isValidEmail, validateRegister } from "./validation";

describe("isValidEmail", () => {
  it.each(["ola@eksempel.no", "a@b.no", "ola.nordmann+trening@post.eksempel.no"])(
    "accepts %s",
    (email) => expect(isValidEmail(email)).toBe(true),
  );

  it.each(["ola@", "@eksempel.no", "ola@eksempel", "a@b@c.no", "ola@eksempel.", "ola @b.no", `${"a".repeat(250)}@b.no`])(
    "rejects %s",
    (email) => expect(isValidEmail(email)).toBe(false),
  );
});

describe("validateRegister", () => {
  it("accepts a valid email (any case, surrounding spaces) and an 8-character password", () => {
    expect(validateRegister({ email: " Ola@Eksempel.no ", password: "hemmelig" })).toEqual({});
  });

  it("asks for an email when it is empty", () => {
    expect(validateRegister({ email: "  ", password: "hemmelig1" })).toEqual({
      email: MESSAGES.emailMissing,
    });
  });

  it("rejects an invalid email", () => {
    expect(validateRegister({ email: "ola@", password: "hemmelig1" }).email).toBe(
      "Skriv inn en gyldig e-postadresse.",
    );
  });

  it("rejects passwords shorter than 8 and longer than 128 characters", () => {
    expect(validateRegister({ email: "a@b.no", password: "1234567" }).password).toBe(
      "Velg et passord på minst 8 tegn.",
    );
    expect(validateRegister({ email: "a@b.no", password: "x".repeat(129) }).password).toBe(
      MESSAGES.passwordTooLong,
    );
    expect(validateRegister({ email: "a@b.no", password: "x".repeat(128) })).toEqual({});
  });

  it("counts characters, not UTF-16 units", () => {
    expect(validateRegister({ email: "a@b.no", password: "🔒".repeat(8) })).toEqual({});
  });

  it("picks the first invalid field in form order", () => {
    expect(firstInvalidField(validateRegister({ email: "", password: "" }))).toBe("email");
    expect(firstInvalidField({ password: "x" })).toBe("password");
    expect(firstInvalidField({})).toBeUndefined();
  });
});
