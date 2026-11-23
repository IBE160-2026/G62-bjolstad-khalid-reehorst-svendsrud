import { MUSCLE_GROUPS, type MuscleGroupSlug } from "./api";

/**
 * A simple body figure, front and back, that colours the six muscle groups of an
 * exercise (story 4.6). Display only: hidden from screen readers (the "Hovedmuskel: …"
 * text line says the same), not clickable and not focusable. Drawn in code as rounded
 * shapes; colours come from the `--muscle-*` tokens so light/dark mode just works.
 */

export type MuscleRole = "primary" | "secondary" | "none";

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

/** One region of a view: a muscle group (or `null` for head, hands, pelvis, feet). */
type Region = { id: string; group: MuscleGroupSlug | null; shape: Shape };

const rect = (x: number, y: number, w: number, h: number, r: number): Shape => ({
  kind: "rect",
  x,
  y,
  w,
  h,
  r,
});
const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({
  kind: "ellipse",
  cx,
  cy,
  rx,
  ry,
});

/** Head, neck, hands and feet: the same in both views and never a muscle group. */
const BODY_PARTS: Region[] = [
  { id: "head", group: null, shape: ellipse(50, 15, 10, 11) },
  { id: "neck", group: null, shape: rect(45, 25, 10, 9, 3) },
  { id: "hand-left", group: null, shape: ellipse(19.5, 122, 5, 6) },
  { id: "hand-right", group: null, shape: ellipse(80.5, 122, 5, 6) },
  { id: "foot-left", group: null, shape: rect(34, 207, 14, 7, 3.5) },
  { id: "foot-right", group: null, shape: rect(52, 207, 14, 7, 3.5) },
];

/** Shoulders and arms sit in the same place in both views; drawn last so the delts sit on top. */
const SHOULDERS_AND_ARMS: Region[] = [
  { id: "shoulder-left", group: "skuldre", shape: ellipse(28, 44, 9, 8) },
  { id: "shoulder-right", group: "skuldre", shape: ellipse(72, 44, 9, 8) },
  { id: "upper-arm-left", group: "armer", shape: rect(17, 52, 11, 32, 5.5) },
  { id: "upper-arm-right", group: "armer", shape: rect(72, 52, 11, 32, 5.5) },
  { id: "forearm-left", group: "armer", shape: rect(15, 86, 9, 29, 4.5) },
  { id: "forearm-right", group: "armer", shape: rect(76, 86, 9, 29, 4.5) },
];

export const FRONT_REGIONS: Region[] = [
  ...BODY_PARTS,
  { id: "chest-left", group: "bryst", shape: rect(31, 37, 18, 21, 6) },
  { id: "chest-right", group: "bryst", shape: rect(51, 37, 18, 21, 6) },
  { id: "abdomen", group: "mage-kjerne", shape: rect(35, 60, 30, 38, 8) },
  { id: "pelvis", group: null, shape: rect(34, 100, 32, 14, 6) },
  { id: "thigh-left", group: "ben", shape: rect(34, 116, 15, 48, 7) },
  { id: "thigh-right", group: "ben", shape: rect(51, 116, 15, 48, 7) },
  { id: "shin-left", group: "ben", shape: rect(35, 166, 13, 39, 6) },
  { id: "shin-right", group: "ben", shape: rect(52, 166, 13, 39, 6) },
  ...SHOULDERS_AND_ARMS,
];

export const BACK_REGIONS: Region[] = [
  ...BODY_PARTS,
  { id: "upper-back", group: "rygg", shape: rect(31, 37, 38, 31, 8) },
  { id: "lower-back", group: "rygg", shape: rect(35, 70, 30, 28, 8) },
  { id: "glutes", group: "ben", shape: rect(34, 100, 32, 18, 8) },
  { id: "hamstring-left", group: "ben", shape: rect(34, 120, 15, 44, 7) },
  { id: "hamstring-right", group: "ben", shape: rect(51, 120, 15, 44, 7) },
  { id: "calf-left", group: "ben", shape: rect(35, 166, 13, 39, 6) },
  { id: "calf-right", group: "ben", shape: rect(52, 166, 13, 39, 6) },
  ...SHOULDERS_AND_ARMS,
];

/**
 * The slug for a muscle group given either its slug ("mage-kjerne") or its name
 * ("Mage/kjerne", what the detail endpoint returns); `null` for anything else.
 */
export function toMuscleSlug(value: string): MuscleGroupSlug | null {
  const needle = value.trim().toLowerCase();
  const match = MUSCLE_GROUPS.find(
    (group) => group.slug === needle || group.name.toLowerCase() === needle,
  );
  return match?.slug ?? null;
}

/** The role of a group for this exercise; the primary wins if it is also listed as secondary. */
export function roleOf(
  group: MuscleGroupSlug | null,
  primary: string,
  secondary: readonly string[],
): MuscleRole {
  if (group === null) return "none";
  if (toMuscleSlug(primary) === group) return "primary";
  if (secondary.some((value) => toMuscleSlug(value) === group)) return "secondary";
  return "none";
}

const FILL_CLASS: Record<MuscleRole, string> = {
  primary: "fill-muscle-primary",
  secondary: "fill-muscle-secondary",
  none: "fill-muscle-base",
};

function RegionShape({ region, role }: { region: Region; role: MuscleRole }) {
  const props = {
    className: `${FILL_CLASS[role]} stroke-card`,
    strokeWidth: 1.5,
    "data-region": region.id,
    "data-role": role,
  };
  const { shape } = region;
  if (shape.kind === "ellipse") {
    return <ellipse {...props} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  }
  return <rect {...props} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} />;
}

function BodyView({
  label,
  view,
  regions,
  primary,
  secondary,
}: {
  label: string;
  view: "front" | "back";
  regions: Region[];
  primary: string;
  secondary: readonly string[];
}) {
  return (
    <figure className="m-0 flex w-full max-w-[7.5rem] flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 216"
        className="h-auto w-full"
        data-view={view}
        focusable="false"
      >
        {regions.map((region) => (
          <RegionShape
            key={region.id}
            region={region}
            role={roleOf(region.group, primary, secondary)}
          />
        ))}
      </svg>
      <figcaption className="text-label text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

function LegendItem({ role, label }: { role: "primary" | "secondary"; label: string }) {
  const swatch = role === "primary" ? "bg-muscle-primary" : "bg-muscle-secondary";
  return (
    <li className="flex items-center gap-2" data-legend={role}>
      <span className={`inline-block size-3.5 shrink-0 rounded-full ${swatch}`} />
      {label}
    </li>
  );
}

export function MuscleFigure({
  primary,
  secondary,
}: {
  primary: string;
  secondary: readonly string[];
}) {
  const primarySlug = toMuscleSlug(primary);
  const hasSecondary = secondary.some((value) => {
    const slug = toMuscleSlug(value);
    return slug !== null && slug !== primarySlug;
  });
  return (
    <div
      aria-hidden="true"
      data-testid="muscle-figure"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex w-full justify-center gap-6">
        <BodyView
          label="Forfra"
          view="front"
          regions={FRONT_REGIONS}
          primary={primary}
          secondary={secondary}
        />
        <BodyView
          label="Bakfra"
          view="back"
          regions={BACK_REGIONS}
          primary={primary}
          secondary={secondary}
        />
      </div>
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-small text-foreground">
        {primarySlug !== null ? <LegendItem role="primary" label="Hovedmuskel" /> : null}
        {hasSecondary ? <LegendItem role="secondary" label="Hjelper til" /> : null}
      </ul>
    </div>
  );
}
