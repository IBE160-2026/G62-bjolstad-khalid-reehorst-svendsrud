"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { osloToday } from "@/modules/food/meals";
import { LINK_CLASS, PRIMARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { WORKOUT_PATH, useActiveWorkout, useAddToWorkout } from "./api";

/**
 * Øvelse: "Legg til i økt" adds the exercise to the workout in progress, starting one for
 * today (Europe/Oslo) if there is none. Afterwards "Lagt til i økta." with a link to Økt
 * (focused, since the button is gone); an exercise already in the workout shows a
 * disabled "Allerede i økta".
 */
export function AddToWorkout({ exerciseId }: { exerciseId: string }) {
  const active = useActiveWorkout();
  const add = useAddToWorkout();
  // Set only by this view's own add, so a visit later shows "Allerede i økta" instead.
  const [added, setAdded] = useState(false);
  const goToWorkout = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (added) goToWorkout.current?.focus();
  }, [added]);

  // Unknown while loading; on a read error the add still resumes the workout on the server.
  const workout = active.isError ? null : (active.data ?? null);
  const inWorkout =
    workout?.exercises.some((exercise) => exercise.exercise_id === exerciseId) ?? false;

  let controls = null;
  if (added) {
    controls = null;
  } else if (inWorkout) {
    controls = (
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" disabled className={PRIMARY_BUTTON_CLASS}>
          Allerede i økta
        </button>
        <Link href={WORKOUT_PATH} className={LINK_CLASS}>
          Gå til økta
        </Link>
      </div>
    );
  } else {
    controls = (
      <div>
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          disabled={active.isPending || add.isPending}
          onClick={() =>
            add.mutate(
              { workoutId: workout?.id ?? null, exerciseId, date: osloToday() },
              { onSuccess: () => setAdded(true) },
            )
          }
        >
          Legg til i økt
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Always rendered, so screen readers announce the text when it appears. */}
      <div role="status" className="text-body text-foreground">
        {added ? (
          <>
            Lagt til i økta.{" "}
            <Link ref={goToWorkout} href={WORKOUT_PATH} className={LINK_CLASS}>
              Gå til økta
            </Link>
          </>
        ) : null}
      </div>
      {controls}
      {/* Outside the controls, so a 409 stays visible next to "Allerede i økta". */}
      {add.isError && !added ? (
        <p role="alert" className="text-body text-destructive">
          {add.error.message}
        </p>
      ) : null}
    </div>
  );
}
