"use client";

import { useId } from "react";

import {
  MUSCLE_GROUPS,
  levelLabel,
  type Level,
  type MuscleGroupSlug,
  type SuggestionFilters,
} from "./api";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

// Selected style as the food method picker (Mat → Legg til).
const SELECTED_CLASS =
  "min-h-11 rounded-full bg-primary px-4 text-small font-medium text-primary-foreground";
const PLAIN_CLASS =
  "min-h-11 rounded-full px-4 text-small font-medium text-foreground hover:bg-muted";
const CHIP_CLASS =
  "min-h-11 rounded-full border-[1.5px] border-border px-4 text-small font-medium text-foreground hover:bg-muted";

function FilterButton({
  label,
  pressed,
  unpressedClass,
  onPress,
}: {
  label: string;
  pressed: boolean;
  unpressedClass: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className={pressed ? SELECTED_CLASS : unpressedClass}
    >
      {label}
    </button>
  );
}

/**
 * Muscle group and level filters for the suggestions (story 4.5). One of each at a
 * time; pressing the selected one clears it. Toggle buttons (`aria-pressed`), ≥ 44 px.
 */
export function SuggestionFilterBar({
  filters,
  onChange,
}: {
  filters: SuggestionFilters;
  onChange: (filters: SuggestionFilters) => void;
}) {
  function toggleMuscle(slug: MuscleGroupSlug) {
    onChange({ ...filters, muscleGroup: filters.muscleGroup === slug ? null : slug });
  }
  function toggleLevel(level: Level) {
    onChange({ ...filters, level: filters.level === level ? null : level });
  }

  const muscleLabelId = useId();
  const levelLabelId = useId();

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-labelledby={muscleLabelId} className="flex flex-col gap-2">
        <p id={muscleLabelId} className="text-small font-medium text-foreground">
          Muskelgruppe
        </p>
        <div className="flex flex-wrap gap-1">
          {MUSCLE_GROUPS.map((group) => (
            <FilterButton
              key={group.slug}
              label={group.name}
              pressed={filters.muscleGroup === group.slug}
              unpressedClass={PLAIN_CLASS}
              onPress={() => toggleMuscle(group.slug)}
            />
          ))}
        </div>
      </div>
      <div role="group" aria-labelledby={levelLabelId} className="flex flex-col gap-2">
        <p id={levelLabelId} className="text-small font-medium text-foreground">
          Nivå
        </p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <FilterButton
              key={level}
              label={levelLabel(level)}
              pressed={filters.level === level}
              unpressedClass={CHIP_CLASS}
              onPress={() => toggleLevel(level)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
