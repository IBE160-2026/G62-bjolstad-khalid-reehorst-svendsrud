/**
 * Client-side checks for Profiloppsett. They mirror the backend rules in
 * `backend/app/modules/profile/schemas.py`; the backend stays the source of truth.
 */

import type { ProfileRequest } from "./api";

export type ProfileField =
  | "sex"
  | "weight_kg"
  | "height_cm"
  | "age"
  | "activity_level"
  | "goal";
export type ProfileValues = Record<ProfileField, string>;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

/** Form order, used to pick the first invalid field to focus. */
export const PROFILE_FIELDS: readonly ProfileField[] = [
  "sex",
  "weight_kg",
  "height_cm",
  "age",
  "activity_level",
  "goal",
];

export const WEIGHT_RANGE = { min: 30, max: 300 } as const;
export const HEIGHT_RANGE = { min: 100, max: 250 } as const;
export const AGE_RANGE = { min: 16, max: 100 } as const;

export const PROFILE_MESSAGES = {
  sexMissing: "Velg kjønn.",
  weightMissing: "Skriv inn vekten din.",
  weightRange: "Vekt må være mellom 30 og 300 kg.",
  weightDecimals: "Skriv vekten med høyst én desimal.",
  heightMissing: "Skriv inn høyden din.",
  heightRange: "Høyde må være mellom 100 og 250 cm.",
  heightWhole: "Skriv høyden i hele centimeter.",
  ageMissing: "Skriv inn alderen din.",
  ageRange: "Alder må være mellom 16 og 100 år.",
  ageWhole: "Skriv alderen i hele år.",
  activityMissing: "Velg aktivitetsnivå.",
  goalMissing: "Velg et mål.",
} as const;

const SEXES: readonly string[] = ["female", "male"];
const ACTIVITY_LEVELS: readonly string[] = [
  "sedentary",
  "light",
  "moderate",
  "very_active",
  "extremely_active",
];
const GOALS: readonly string[] = ["lose", "maintain", "gain"];

/** A number as typed: "82,5" and "82.5" both work. NaN when it is not a plain number. */
function parseNumber(value: string): number {
  const text = value.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
}

function decimals(value: string): number {
  return value.trim().replace(",", ".").split(".")[1]?.length ?? 0;
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

export type ProfileValidation =
  | { ok: true; body: ProfileRequest }
  | { ok: false; errors: ProfileErrors };

export function validateProfile(values: ProfileValues): ProfileValidation {
  const errors: ProfileErrors = {};
  const m = PROFILE_MESSAGES;

  if (!SEXES.includes(values.sex)) errors.sex = m.sexMissing;

  const weight = parseNumber(values.weight_kg);
  if (!values.weight_kg.trim()) errors.weight_kg = m.weightMissing;
  else if (!inRange(weight, WEIGHT_RANGE)) errors.weight_kg = m.weightRange;
  else if (decimals(values.weight_kg) > 1) errors.weight_kg = m.weightDecimals;

  const height = parseNumber(values.height_cm);
  if (!values.height_cm.trim()) errors.height_cm = m.heightMissing;
  else if (!Number.isNaN(height) && !Number.isInteger(height)) errors.height_cm = m.heightWhole;
  else if (!inRange(height, HEIGHT_RANGE)) errors.height_cm = m.heightRange;

  const age = parseNumber(values.age);
  if (!values.age.trim()) errors.age = m.ageMissing;
  else if (!Number.isNaN(age) && !Number.isInteger(age)) errors.age = m.ageWhole;
  else if (!inRange(age, AGE_RANGE)) errors.age = m.ageRange;

  if (!ACTIVITY_LEVELS.includes(values.activity_level)) errors.activity_level = m.activityMissing;
  if (!GOALS.includes(values.goal)) errors.goal = m.goalMissing;

  if (firstInvalidProfileField(errors)) return { ok: false, errors };
  return {
    ok: true,
    body: {
      sex: values.sex as ProfileRequest["sex"],
      weight_kg: weight,
      height_cm: height,
      age,
      activity_level: values.activity_level as ProfileRequest["activity_level"],
      goal: values.goal as ProfileRequest["goal"],
    },
  };
}

export function firstInvalidProfileField(errors: ProfileErrors): ProfileField | undefined {
  return PROFILE_FIELDS.find((field) => errors[field]);
}

export function isProfileField(field: string): field is ProfileField {
  return (PROFILE_FIELDS as readonly string[]).includes(field);
}
