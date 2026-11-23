import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MuscleFigure, toMuscleSlug } from "./muscle-figure";

function roles(view: "front" | "back") {
  const svg = screen.getByTestId("muscle-figure").querySelector(`svg[data-view="${view}"]`);
  const result: Record<string, string> = {};
  svg?.querySelectorAll("[data-region]").forEach((shape) => {
    result[shape.getAttribute("data-region") ?? ""] = shape.getAttribute("data-role") ?? "";
  });
  return result;
}

function fillOf(view: "front" | "back", region: string) {
  return screen
    .getByTestId("muscle-figure")
    .querySelector(`svg[data-view="${view}"] [data-region="${region}"]`)
    ?.getAttribute("class");
}

describe("MuscleFigure", () => {
  it("push-up: chest strong, shoulders and arms light in both views", () => {
    render(<MuscleFigure primary="Bryst" secondary={["Skuldre", "Armer"]} />);
    const front = roles("front");
    expect(front["chest-left"]).toBe("primary");
    expect(front["chest-right"]).toBe("primary");
    expect(front["shoulder-left"]).toBe("secondary");
    expect(front["upper-arm-right"]).toBe("secondary");
    expect(front["forearm-left"]).toBe("secondary");
    expect(front["abdomen"]).toBe("none");
    expect(front["thigh-left"]).toBe("none");
    const back = roles("back");
    expect(back["shoulder-right"]).toBe("secondary");
    expect(back["upper-arm-left"]).toBe("secondary");
    expect(back["upper-back"]).toBe("none");
    expect(back["glutes"]).toBe("none");
    expect(fillOf("front", "chest-left")).toContain("fill-muscle-primary");
    expect(fillOf("front", "abdomen")).toContain("fill-muscle-base");
    // Secondary regions are striped (a pattern), primary regions are solid.
    const figure = screen.getByTestId("muscle-figure");
    const pattern = figure.querySelector("pattern");
    expect(pattern?.id).toBeTruthy();
    const stripes = `url(#${pattern?.id})`;
    const shape = (view: string, region: string) =>
      figure.querySelector(`svg[data-view="${view}"] [data-region="${region}"]`);
    for (const region of ["shoulder-left", "upper-arm-right", "forearm-left"]) {
      expect(shape("front", region)).toHaveAttribute("fill", stripes);
      expect(shape("back", region)).toHaveAttribute("fill", stripes);
    }
    expect(shape("front", "chest-left")).not.toHaveAttribute("fill");
    expect(shape("front", "chest-right")).not.toHaveAttribute("fill");
    expect(figure.querySelector('[data-swatch="secondary"]')).toHaveAttribute("fill", stripes);
    expect(figure.querySelector('[data-swatch="primary"]')).not.toHaveAttribute("fill");
    expect(screen.getByText("Hovedmuskel")).toBeInTheDocument();
    expect(screen.getByText("Hjelper til")).toBeInTheDocument();
  });

  it("squat: legs strong in both views, abdomen light on the front", () => {
    render(<MuscleFigure primary="ben" secondary={["mage-kjerne"]} />);
    const front = roles("front");
    for (const region of ["thigh-left", "thigh-right", "shin-left", "shin-right"]) {
      expect(front[region]).toBe("primary");
    }
    expect(front["abdomen"]).toBe("secondary");
    expect(front["pelvis"]).toBe("none");
    const back = roles("back");
    for (const region of ["glutes", "hamstring-left", "hamstring-right", "calf-left", "calf-right"]) {
      expect(back[region]).toBe("primary");
    }
    expect(back["lower-back"]).toBe("none");
  });

  it("no secondary: back strong and only the main legend item", () => {
    render(<MuscleFigure primary="Rygg" secondary={[]} />);
    const back = roles("back");
    expect(back["upper-back"]).toBe("primary");
    expect(back["lower-back"]).toBe("primary");
    expect(Object.values(roles("front"))).not.toContain("primary");
    expect(Object.values(roles("front"))).not.toContain("secondary");
    expect(screen.getByText("Hovedmuskel")).toBeInTheDocument();
    expect(screen.queryByText("Hjelper til")).not.toBeInTheDocument();
  });

  it("ignores unknown groups without crashing", () => {
    render(<MuscleFigure primary="Hele kroppen" secondary={["Biceps"]} />);
    expect(Object.values(roles("front"))).toEqual(expect.not.arrayContaining(["primary", "secondary"]));
    expect(Object.values(roles("back"))).toEqual(expect.not.arrayContaining(["primary", "secondary"]));
    expect(screen.queryByText("Hovedmuskel")).not.toBeInTheDocument();
    expect(screen.queryByText("Hjelper til")).not.toBeInTheDocument();
  });

  it("is decorative: hidden from screen readers, nothing focusable, labelled views", () => {
    render(<MuscleFigure primary="Bryst" secondary={["Armer"]} />);
    const figure = screen.getByTestId("muscle-figure");
    expect(figure).toHaveAttribute("aria-hidden", "true");
    expect(figure.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
    expect(screen.getByText("Forfra")).toBeInTheDocument();
    expect(screen.getByText("Bakfra")).toBeInTheDocument();
  });

  it("gives each figure its own stripe pattern id", () => {
    render(
      <>
        <MuscleFigure primary="Bryst" secondary={["Armer"]} />
        <MuscleFigure primary="Ben" secondary={["Rygg"]} />
      </>,
    );
    const ids = screen.getAllByTestId("muscle-figure").map((figure) => {
      const id = figure.querySelector("pattern")?.id;
      expect(figure.querySelector('[data-swatch="secondary"]')).toHaveAttribute("fill", `url(#${id})`);
      return id;
    });
    expect(new Set(ids).size).toBe(2);
  });

  it("maps both slugs and display names to the six groups", () => {
    expect(toMuscleSlug("Mage/kjerne")).toBe("mage-kjerne");
    expect(toMuscleSlug("mage-kjerne")).toBe("mage-kjerne");
    expect(toMuscleSlug("Skuldre")).toBe("skuldre");
    expect(toMuscleSlug("triceps")).toBeNull();
  });
});
