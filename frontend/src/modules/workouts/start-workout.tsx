"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { osloToday } from "@/modules/food/meals";
import { PRIMARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { WORKOUT_PATH, exerciseCountText, useActiveWorkout, useStartWorkout } from "./api";

/**
 * Trening: "Start økt" creates a workout for today (Europe/Oslo) and opens Økt, or
 * "Fortsett økt · N øvelser" when one is in progress. Both go to the Økt page.
 */
export function StartWorkout() {
  const router = useRouter();
  const active = useActiveWorkout();
  const start = useStartWorkout();

  if (active.isPending) {
    return <div aria-hidden="true" className="h-[50px] w-40 animate-pulse rounded-full bg-muted" />;
  }

  // If the active workout could not be read, starting still resumes it on the server.
  const workout = active.isError ? null : active.data;
  if (workout) {
    return (
      <Link
        href={WORKOUT_PATH}
        className={`inline-flex items-center self-start ${PRIMARY_BUTTON_CLASS}`}
      >
        Fortsett økt · {exerciseCountText(workout.exercises.length)}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className={PRIMARY_BUTTON_CLASS}
        disabled={start.isPending}
        onClick={() =>
          start.mutate(osloToday(), { onSuccess: () => router.push(WORKOUT_PATH) })
        }
      >
        Start økt
      </button>
      {start.isError ? (
        <p role="alert" className="text-body text-destructive">
          {start.error.message}
        </p>
      ) : null}
    </div>
  );
}
