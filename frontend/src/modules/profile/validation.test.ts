import { describe, expect, it } from "vitest";

import { PROFILE_MESSAGES as M, validateProfile, type ProfileValues } from "./validation";

const SARA: ProfileValues = {
  sex: "female",
  weight_kg: "82",
  height_cm: "162",
  age: "23",
  activity_level: "light",
  goal: "lose",
};

function errorsFor(values: Partial<ProfileValues>) {
  const result = validateProfile({ ...SARA, ...values });
  return result.ok ? {} : result.errors;
}

describe("validateProfile", () => {
  it("accepts Sara's values and builds the request body", () => {
    expect(validateProfile(SARA)).toEqual({
      ok: true,
      body: {
        sex: "female",
        weight_kg: 82,
        height_cm: 162,
        age: 23,
        activity_level: "light",
        goal: "lose",
      },
    });
  });

  it("accepts a decimal comma and one decimal for weight", () => {
    const result = validateProfile({ ...SARA, weight_kg: "82,5" });
    expect(result.ok && result.body.weight_kg).toBe(82.5);
    expect(errorsFor({ weight_kg: "82.25" })).toEqual({ weight_kg: M.weightDecimals });
  });

  it("requires every field", () => {
    const result = validateProfile({
      sex: "",
      weight_kg: "",
      height_cm: " ",
      age: "",
      activity_level: "",
      goal: "",
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        sex: M.sexMissing,
        weight_kg: M.weightMissing,
        height_cm: M.heightMissing,
        age: M.ageMissing,
        activity_level: M.activityMissing,
        goal: M.goalMissing,
      },
    });
  });

  it("mirrors the backend ranges, edges included", () => {
    expect(errorsFor({ weight_kg: "29", height_cm: "251", age: "15" })).toEqual({
      weight_kg: "Vekt må være mellom 30 og 300 kg.",
      height_cm: "Høyde må være mellom 100 og 250 cm.",
      age: "Alder må være mellom 16 og 100 år.",
    });
    expect(errorsFor({ weight_kg: "300.1", height_cm: "99", age: "101" })).toEqual({
      weight_kg: M.weightRange,
      height_cm: M.heightRange,
      age: M.ageRange,
    });
    expect(errorsFor({ weight_kg: "30", height_cm: "100", age: "16" })).toEqual({});
    expect(errorsFor({ weight_kg: "300", height_cm: "250", age: "100" })).toEqual({});
  });

  it("wants whole numbers for height and age", () => {
    expect(errorsFor({ height_cm: "170,5", age: "30.5" })).toEqual({
      height_cm: M.heightWhole,
      age: M.ageWhole,
    });
  });

  it("rejects text that is not a number", () => {
    expect(errorsFor({ weight_kg: "åtti", height_cm: "1e2", age: "-20" })).toEqual({
      weight_kg: M.weightRange,
      height_cm: M.heightRange,
      age: M.ageRange,
    });
  });

  it("rejects unknown choices", () => {
    expect(errorsFor({ sex: "other", activity_level: "lazy", goal: "bulk" })).toEqual({
      sex: M.sexMissing,
      activity_level: M.activityMissing,
      goal: M.goalMissing,
    });
  });
});
