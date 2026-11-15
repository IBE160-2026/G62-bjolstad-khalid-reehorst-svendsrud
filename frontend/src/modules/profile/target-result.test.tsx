import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Profile } from "./api";
import { TargetResult, formatKcal } from "./target-result";

const SARA: Profile = {
  sex: "female",
  weight_kg: 82,
  height_cm: 162,
  age: 23,
  activity_level: "light",
  goal: "lose",
  target_kcal: 1640,
  floor_applied: false,
  updated_at: "2026-11-15T12:00:00Z",
};

describe("formatKcal", () => {
  it("uses a space as thousands separator", () => {
    expect(formatKcal(1640)).toBe("1 640");
    expect(formatKcal(980)).toBe("980");
    expect(formatKcal(12345)).toBe("12 345");
  });
});

describe("TargetResult", () => {
  it("shows one number, a goal sentence and a link on to I dag", () => {
    const { container } = render(<TargetResult profile={SARA} />);

    expect(container).toHaveTextContent("1 640 kcal om dagen");
    expect(
      screen.getByText("Spiser du rundt dette hver dag, går du rolig ned i vekt."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Videre" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { name: "Dagens mål" })).toHaveFocus();
    expect(container).not.toHaveTextContent(/trygt|grovt anslag/);
  });

  it.each([
    ["female", 1200, "Målet er satt til minst 1 200 kcal for å være trygt."],
    ["male", 1500, "Målet er satt til minst 1 500 kcal for å være trygt."],
  ] as const)("adds the floor line for %s", (sex, kcal, line) => {
    render(<TargetResult profile={{ ...SARA, sex, target_kcal: kcal, floor_applied: true }} />);

    expect(screen.getByText(line)).toBeInTheDocument();
  });

  it.each([16, 17])("adds the rough-estimate line at age %i", (age) => {
    render(<TargetResult profile={{ ...SARA, age }} />);

    expect(
      screen.getByText("Dette er et grovt anslag. Formelen er laget for voksne."),
    ).toBeInTheDocument();
  });

  it("leaves out the rough-estimate line from 18", () => {
    render(<TargetResult profile={{ ...SARA, age: 18 }} />);

    expect(screen.queryByText(/grovt anslag/)).not.toBeInTheDocument();
  });

  it.each(["maintain", "gain"] as const)("has a sentence for goal %s", (goal) => {
    const { container } = render(<TargetResult profile={{ ...SARA, goal }} />);

    expect(container).toHaveTextContent(goal === "gain" ? "opp i vekt" : "holder du vekten");
  });

  it("never uses formula words", () => {
    const { container } = render(
      <TargetResult profile={{ ...SARA, age: 16, floor_applied: true, target_kcal: 1200 }} />,
    );

    expect(container.textContent).not.toMatch(/BMR|TDEE|Mifflin/i);
  });
});
