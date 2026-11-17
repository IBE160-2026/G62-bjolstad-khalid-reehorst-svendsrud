"use client";

import Link from "next/link";

import { PROFILE_SETUP_PATH } from "@/modules/identity/routes";
import { LINK_CLASS } from "@/modules/identity/styles";

import { kcalText, roundKcal, type Overview } from "./api";

export const NOTE_CLASS =
  "relative flex flex-col gap-2 rounded-md border border-border bg-note-paper p-6 shadow-card";

/** The yellow pin on the top edge of the note (decoration only). */
function Pin() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-note shadow-card"
    />
  );
}

/**
 * The day note (FR7): one big number and one sentence. Over the target it stays in ink,
 * with a supportive sentence and no warning (VOICE.md). Without a profile it asks for one.
 */
export function DayNote({ overview, isToday }: { overview: Overview; isToday: boolean }) {
  const target = overview.calorie_target;
  const remaining = overview.kcal_remaining;

  if (target === null || remaining === null) {
    return (
      <section aria-label="Dagens mål" className={NOTE_CLASS} data-testid="day-note">
        <Pin />
        <p className="text-body text-foreground">
          <Link href={PROFILE_SETUP_PATH} className={LINK_CLASS}>
            Fyll inn profilen for å få dagens mål.
          </Link>
        </p>
      </section>
    );
  }

  const rounded = roundKcal(remaining);
  if (rounded < 0) {
    const over = kcalText(-rounded);
    return (
      <section aria-label="Dagens mål" className={NOTE_CLASS} data-testid="day-note">
        <Pin />
        <p className="text-display font-light text-foreground tabular-nums">{over} kcal over</p>
        <p className="text-body text-foreground">
          {isToday
            ? `Du er ${over} kcal over målet i dag. Det går fint, i morgen er en ny dag.`
            : `Du er ${over} kcal over målet denne dagen.`}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Dagens mål" className={NOTE_CLASS} data-testid="day-note">
      <Pin />
      <p className="flex flex-col gap-2 text-foreground">
        <span className="text-display font-light tabular-nums">{kcalText(rounded)} kcal</span>{" "}
        <span className="text-body">
          igjen av {isToday ? "dagens mål" : "målet"} på {kcalText(target)}
        </span>
      </p>
    </section>
  );
}
