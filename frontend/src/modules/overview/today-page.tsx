"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useOsloToday } from "@/modules/food/food-day";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";
import { WORKOUT_PATH, useActiveWorkout, workoutDateText } from "@/modules/workouts/api";

import { DATE_PARAM, parseDateParam, useOverview, type Overview } from "./api";
import { DayNote, NOTE_CLASS } from "./day-note";
import { FoodCard } from "./food-card";
import { TrainingCard } from "./training-card";
import { CARD_CLASS } from "./card";

const ACTION_CLASS = `inline-flex items-center justify-center ${PRIMARY_BUTTON_CLASS}`;

/** "Logg mat" and "Start økt" ("Fortsett økt" while one is in progress): the only two
 * primary actions on I dag. */
function Actions() {
  const active = useActiveWorkout();
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/mat" className={ACTION_CLASS}>
        Logg mat
      </Link>
      {active.data ? (
        <Link href={WORKOUT_PATH} className={ACTION_CLASS}>
          Fortsett økt
        </Link>
      ) : (
        <Link href="/trening" className={ACTION_CLASS}>
          Start økt
        </Link>
      )}
    </div>
  );
}

function isEmptyDay(overview: Overview): boolean {
  return (
    overview.workouts.length === 0 && overview.meals.every((meal) => meal.entries.length === 0)
  );
}

/**
 * I dag (stories 6.1 and 6.2): the day note, the two actions, and the Mat and Trening cards
 * for `?dato=` (default today in Europe/Oslo). Read-only; logging happens on Mat and Trening.
 */
export function TodayPage() {
  const today = useOsloToday();
  const param = parseDateParam(useSearchParams().get(DATE_PARAM), today);
  const date = param ?? today;
  const isToday = date !== null && date === today;
  const overview = useOverview(date);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-title font-light text-foreground">
        {date === null || isToday ? "I dag" : workoutDateText(date)}
      </h2>

      {overview.isError && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-body text-destructive">
            {overview.error.message}
          </p>
          <button
            type="button"
            onClick={() => overview.refetch()}
            className={SECONDARY_BUTTON_CLASS}
          >
            Prøv igjen
          </button>
        </div>
      )}

      {overview.data && !isToday && isEmptyDay(overview.data) && (
        <p className="text-body text-foreground">Ingenting logget denne dagen.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          {overview.data ? (
            <DayNote overview={overview.data} isToday={isToday} />
          ) : (
            !overview.isError && (
              <div aria-hidden="true" className={`${NOTE_CLASS} h-40 animate-pulse`} />
            )
          )}
          <Actions />
        </div>
        <div className="flex flex-col gap-4">
          {overview.data ? (
            <>
              <FoodCard overview={overview.data} isToday={isToday} />
              <TrainingCard overview={overview.data} isToday={isToday} />
            </>
          ) : (
            !overview.isError && (
              <div
                role="status"
                aria-busy="true"
                className="flex flex-col gap-4"
                data-testid="overview-skeleton"
              >
                <span className="sr-only">Laster dagen …</span>
                <div aria-hidden="true" className={`${CARD_CLASS} h-48 animate-pulse`} />
                <div aria-hidden="true" className={`${CARD_CLASS} h-32 animate-pulse`} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
