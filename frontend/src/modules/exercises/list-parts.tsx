"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { exercisePath, type ExerciseListItem } from "./api";

/** Shared pieces of the Trening lists: suggestions (4.3) and search results (4.4). */

export function ListSkeleton({ testId = "exercise-list-skeleton" }: { testId?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3" data-testid={testId}>
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-body text-destructive">
        {message}
      </p>
      <button type="button" onClick={onRetry} className={SECONDARY_BUTTON_CLASS}>
        Prøv igjen
      </button>
    </div>
  );
}

/** One exercise row linking to its detail page; `extra` adds a muted line below. */
export function ExerciseRow({
  exercise,
  extra,
}: {
  exercise: ExerciseListItem;
  extra?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={exercisePath(exercise.id)}
        className="flex min-h-11 flex-col gap-0.5 rounded-sm px-2 py-2 hover:bg-muted"
      >
        <span className="text-body text-foreground">{exercise.name}</span>
        <span className="text-small text-muted-foreground">
          {exercise.primary_muscle_group} · {exercise.equipment.join(", ")}
        </span>
        {extra}
      </Link>
    </li>
  );
}
