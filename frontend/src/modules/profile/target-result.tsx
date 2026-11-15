"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { HOME_PATH } from "@/modules/identity/routes";
import { PRIMARY_BUTTON_CLASS } from "@/modules/identity/styles";

import type { Profile } from "./api";

/** "1640" → "1 640": a space as thousands separator (VOICE.md). */
export function formatKcal(kcal: number): string {
  return String(Math.round(kcal)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const GOAL_SENTENCES: Record<Profile["goal"], string> = {
  lose: "Spiser du rundt dette hver dag, går du rolig ned i vekt.",
  maintain: "Spiser du rundt dette hver dag, holder du vekten.",
  gain: "Spiser du rundt dette hver dag, går du rolig opp i vekt.",
};

const ADULT_AGE = 18;

/**
 * The stored target as one number and a few plain sentences; never formula words.
 * Profiloppsett focuses it and offers "Videre"; the Profil page shows it in place.
 */
export function TargetResult({
  profile,
  standalone = true,
}: {
  profile: Profile;
  standalone?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (standalone) headingRef.current?.focus();
  }, [standalone]);

  return (
    <section aria-labelledby="target-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2
          id="target-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-heading font-medium text-foreground"
        >
          Dagens mål
        </h2>
        <p className="text-display font-light text-foreground">
          <span className="whitespace-nowrap">{formatKcal(profile.target_kcal)} kcal</span> om
          dagen
        </p>
      </div>

      <div className="flex flex-col gap-2 text-body text-foreground">
        <p>{GOAL_SENTENCES[profile.goal]}</p>
        {profile.floor_applied && (
          <p>Målet er satt til minst {formatKcal(profile.target_kcal)} kcal for å være trygt.</p>
        )}
        {profile.age < ADULT_AGE && <p>Dette er et grovt anslag. Formelen er laget for voksne.</p>}
      </div>

      {standalone && (
        <Link
          href={HOME_PATH}
          className={`${PRIMARY_BUTTON_CLASS} inline-flex items-center justify-center`}
        >
          Videre
        </Link>
      )}
    </section>
  );
}
