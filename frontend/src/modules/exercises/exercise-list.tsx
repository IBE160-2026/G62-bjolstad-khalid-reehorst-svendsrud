"use client";

import Link from "next/link";

import { SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import {
  exercisePath,
  levelLabel,
  useExercises,
  type ExerciseListItem,
} from "./api";

type Group = { muscle: string; exercises: ExerciseListItem[] };

/** Group by primary muscle group, keeping the backend's order. */
export function groupByMuscle(exercises: ExerciseListItem[]): Group[] {
  const groups: Group[] = [];
  for (const exercise of exercises) {
    const last = groups.at(-1);
    const existing =
      last?.muscle === exercise.primary_muscle_group
        ? last
        : groups.find((group) => group.muscle === exercise.primary_muscle_group);
    if (existing) existing.exercises.push(exercise);
    else groups.push({ muscle: exercise.primary_muscle_group, exercises: [exercise] });
  }
  return groups;
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3" data-testid="exercise-list-skeleton">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

/** Trening: every exercise grouped by primary muscle group, each opening its detail page. */
export function ExerciseList() {
  const exercises = useExercises();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Velg en øvelse for å se hvordan du gjør den.
      </p>
      {exercises.isPending && <ListSkeleton />}
      {exercises.isError && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-body text-destructive">
            {exercises.error.message}
          </p>
          <button
            type="button"
            onClick={() => exercises.refetch()}
            className={SECONDARY_BUTTON_CLASS}
          >
            Prøv igjen
          </button>
        </div>
      )}
      {exercises.data?.length === 0 && (
        <p className="text-body text-foreground">Ingen øvelser ennå.</p>
      )}
      {exercises.data &&
        groupByMuscle(exercises.data).map((group) => {
          const headingId = `muscle-${group.muscle}-heading`.replace(/[^\w-]/g, "-");
          return (
            <section
              key={group.muscle}
              aria-labelledby={headingId}
              className="flex flex-col gap-2 rounded-lg bg-card p-4 shadow-sm"
            >
              <h2 id={headingId} className="text-heading font-medium text-foreground">
                {group.muscle}
              </h2>
              <ul className="-mx-2 flex flex-col divide-y divide-border">
                {group.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link
                      href={exercisePath(exercise.id)}
                      className="flex min-h-11 flex-col gap-0.5 rounded-sm px-2 py-2 hover:bg-muted"
                    >
                      <span className="text-body text-foreground">{exercise.name}</span>
                      <span className="text-small text-muted-foreground">
                        {levelLabel(exercise.level)} · {exercise.equipment.join(", ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
