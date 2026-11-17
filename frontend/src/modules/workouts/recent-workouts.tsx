"use client";

import Link from "next/link";

import { recentWorkoutText, useFinishedWorkouts, workoutPath } from "./api";

/** "Tidligere økter" on Trening (story 5.4): the latest finished workouts, each a link to
 * its page. Hidden while loading, on error and when there are none. */
export function RecentWorkouts() {
  const finished = useFinishedWorkouts();
  if (!finished.data || finished.data.length === 0) return null;

  return (
    <section aria-labelledby="recent-workouts-title" className="flex flex-col gap-2">
      <h2 id="recent-workouts-title" className="text-heading font-semibold text-foreground">
        Tidligere økter
      </h2>
      <ul className="-mx-2 flex flex-col divide-y divide-border rounded-lg bg-card px-2 shadow-sm">
        {finished.data.map((workout) => (
          <li key={workout.id}>
            <Link
              href={workoutPath(workout.id)}
              className="flex min-h-11 items-center rounded-sm px-2 py-2 text-body text-foreground hover:bg-muted"
            >
              {recentWorkoutText(workout)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
