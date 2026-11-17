"use client";

import Link from "next/link";

import { formatGrams, mealLabel } from "@/modules/food/meals";

import { kcalText, type Overview } from "./api";
import { CardHeader, CARD_CLASS } from "./card";

/**
 * Mat on I dag: each Meal with its total and entries (read-only). Nothing logged today
 * invites the first meal (story 6.2); today, an empty Meal links to Mat with "+ Legg til".
 * Mat logs to today, so earlier dates get no add links.
 */
export function FoodCard({ overview, isToday }: { overview: Overview; isToday: boolean }) {
  const empty = overview.meals.every((meal) => meal.entries.length === 0);

  return (
    <section aria-labelledby="food-card-title" className={CARD_CLASS} data-testid="food-card">
      <CardHeader id="food-card-title" href="/mat" title="Mat" />
      {empty && isToday ? (
        <Link
          href="/mat"
          className="min-h-11 self-start rounded-full px-2 py-2 text-body font-medium text-mark-text hover:bg-mark-tint"
        >
          Logg ditt første måltid i dag
        </Link>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {overview.meals.map((summary) => (
            <li key={summary.meal} className="flex flex-col gap-1 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-body font-medium text-foreground">
                  {mealLabel(summary.meal)}
                </h3>
                <span className="text-body text-foreground tabular-nums">
                  {kcalText(summary.total_kcal)} kcal
                </span>
              </div>
              {summary.entries.length === 0 ? (
                isToday && (
                  <Link
                    href="/mat"
                    aria-label={`Legg til i ${mealLabel(summary.meal).toLowerCase()}`}
                    className="min-h-11 self-start rounded-full px-2 py-2 text-button font-medium text-mark-text hover:bg-mark-tint"
                  >
                    + Legg til
                  </Link>
                )
              ) : (
                <ul className="flex flex-col">
                  {summary.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-3 text-small text-muted-foreground"
                    >
                      <span>
                        {entry.name} <span className="tabular-nums">{formatGrams(entry.grams)} g</span>
                      </span>
                      <span className="shrink-0 tabular-nums">{kcalText(entry.kcal)} kcal</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
