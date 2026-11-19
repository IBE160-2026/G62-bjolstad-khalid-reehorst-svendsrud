"use client";

import Link from "next/link";

import { ApiError } from "@/modules/identity/api";
import { LINK_CLASS, SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";
import { AddToWorkout } from "@/modules/workouts/add-to-workout";

import { levelLabel, useExercise, type ExerciseDetail as Exercise } from "./api";
import { VideoEmbed } from "./video-embed";

export const SAFETY_NOTE =
  "Dette er generelle råd, ikke en erstatning for lege eller fysioterapeut. Start med lav vekt og øk rolig.";

/** "Hovedmuskel: Bryst · Hjelper til: Skuldre, Armer" (the second part only if any). */
export function musclesText(exercise: Pick<Exercise, "primary_muscle_group" | "secondary_muscle_groups">): string {
  const primary = `Hovedmuskel: ${exercise.primary_muscle_group}`;
  if (exercise.secondary_muscle_groups.length === 0) return primary;
  return `${primary} · Hjelper til: ${exercise.secondary_muscle_groups.join(", ")}`;
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4" data-testid="exercise-detail-skeleton">
      <div className="h-8 w-2/3 animate-pulse rounded-sm bg-muted" />
      <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/trening" className={`self-start ${LINK_CLASS}`}>
      Gå tilbake til Trening
    </Link>
  );
}

/** Øvelse: video first, then the steps, muscles, equipment, level and the safety note. */
export function ExerciseDetail({ id }: { id: string }) {
  const query = useExercise(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-body text-destructive">
          {query.error.message}
        </p>
        {query.error instanceof ApiError && query.error.code === "exercise_not_found" ? (
          <BackLink />
        ) : (
          <button type="button" onClick={() => query.refetch()} className={SECONDARY_BUTTON_CLASS}>
            Prøv igjen
          </button>
        )}
      </div>
    );
  }

  const exercise = query.data;
  return (
    <article className="flex flex-col gap-6">
      <BackLink />
      <h2 className="text-title font-medium text-foreground">{exercise.name}</h2>
      <AddToWorkout key={exercise.id} exerciseId={exercise.id} />
      <VideoEmbed
        videoId={exercise.video_id}
        title={`Video: ${exercise.name}`}
        short={exercise.video_short}
      />

      <section aria-labelledby="steps-heading" className="flex flex-col gap-2">
        <h3 id="steps-heading" className="text-heading font-medium text-foreground">
          Slik gjør du det
        </h3>
        <ol className="flex list-decimal flex-col gap-2 pl-6 text-body text-foreground">
          {exercise.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="muscles-heading" className="flex flex-col gap-2">
        <h3 id="muscles-heading" className="text-heading font-medium text-foreground">
          Muskler som jobber
        </h3>
        <p className="text-body text-foreground">{musclesText(exercise)}</p>
      </section>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
        <dt className="text-muted-foreground">Utstyr</dt>
        <dd className="text-foreground">{exercise.equipment.join(", ")}</dd>
        <dt className="text-muted-foreground">Nivå</dt>
        <dd className="text-foreground">{levelLabel(exercise.level)}</dd>
      </dl>

      <p className="rounded-lg bg-note-paper p-4 text-small text-foreground" data-testid="safety-note">
        {SAFETY_NOTE}
      </p>
    </article>
  );
}
