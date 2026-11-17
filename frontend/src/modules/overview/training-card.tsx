"use client";

import Link from "next/link";

import {
  formatNumber,
  lastSetText,
  lastTimeText,
  workoutPath,
} from "@/modules/workouts/api";

import type { OverviewSet, Overview } from "./api";
import { CardHeader, CARD_CLASS } from "./card";

function amountText(set: OverviewSet): string | null {
  if (set.seconds !== null) return `${set.seconds} s`;
  return set.reps !== null ? String(set.reps) : null;
}

/** "3 × 10 · 10 kg" when every set matches ("3 × 10" bodyweight, "2 × 45 s"); otherwise each
 * set listed ("10 kg × 10, 8 kg × 8"). */
export function setsText(sets: OverviewSet[]): string {
  const [first] = sets;
  const same =
    first !== undefined &&
    sets.every(
      (set) =>
        set.reps === first.reps &&
        set.seconds === first.seconds &&
        set.weight_kg === first.weight_kg,
    );
  const amount = first ? amountText(first) : null;
  if (same && amount !== null) {
    const kg = first.weight_kg !== null ? ` · ${formatNumber(first.weight_kg)} kg` : "";
    return `${sets.length} × ${amount}${kg}`;
  }
  const listed = sets
    .map(lastSetText)
    .filter((text): text is string => text !== null)
    .join(", ");
  return listed || `${sets.length} sett`;
}

/**
 * Trening on I dag: the date's workouts with their done sets and "Sist" (read-only), each
 * linking to its page. No workout today invites one (story 6.2); Trening starts today's
 * workout, so earlier dates get no link.
 */
export function TrainingCard({ overview, isToday }: { overview: Overview; isToday: boolean }) {
  const several = overview.workouts.length > 1;
  return (
    <section
      aria-labelledby="training-card-title"
      className={CARD_CLASS}
      data-testid="training-card"
    >
      <CardHeader id="training-card-title" href="/trening" title="Trening" />
      {overview.workouts.length === 0 ? (
        isToday && (
          <Link
            href="/trening"
            className="min-h-11 self-start rounded-full px-2 py-2 text-body font-medium text-mark-text hover:bg-mark-tint"
          >
            Start en økt
          </Link>
        )
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {overview.workouts.map((workout, index) => (
            <li key={workout.id} className="flex flex-col gap-1 py-2">
              <Link
                href={workoutPath(workout.id)}
                className="-mx-2 flex min-h-11 items-center rounded-sm px-2 text-body font-medium text-foreground hover:bg-muted"
              >
                {several ? `Økt ${index + 1}` : "Økt"}
                {workout.finished_at ? "" : " som pågår"}
              </Link>
              <ul className="flex flex-col gap-2">
                {workout.exercises.map((exercise) => (
                  <li key={exercise.id} className="flex flex-col">
                    <p className="text-body text-foreground">
                      {exercise.name}{" "}
                      <span className="tabular-nums">{setsText(exercise.sets)}</span>
                    </p>
                    {/* No earlier sets: the "Sist" line is hidden (EXPERIENCE.md). */}
                    {exercise.last_time && exercise.last_time.sets.length > 0 && (
                      <p className="text-small text-muted-foreground">
                        {lastTimeText(exercise.last_time, workout.date)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
