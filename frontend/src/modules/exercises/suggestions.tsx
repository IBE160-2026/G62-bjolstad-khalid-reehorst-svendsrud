"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useMe } from "@/modules/identity/api";
import { LINK_CLASS, SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import {
  exercisePath,
  levelLabel,
  readStoredProfileId,
  storeProfileId,
  useEquipmentProfiles,
  useSuggestions,
  type ExerciseListItem,
  type Level,
} from "./api";
import { ProfileSwitch } from "./profile-switch";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

type Group = { level: Level; exercises: ExerciseListItem[] };

/** Group by level, Nybegynner first, keeping the backend's order; empty groups dropped. */
export function groupByLevel(exercises: ExerciseListItem[]): Group[] {
  return LEVELS.map((level) => ({
    level,
    exercises: exercises.filter((exercise) => exercise.level === level),
  })).filter((group) => group.exercises.length > 0);
}

export function countText(count: number, profileName: string): string {
  return `${count} ${count === 1 ? "øvelse passer" : "øvelser passer"} med ${profileName}`;
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

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function SuggestionList({ profileId }: { profileId: string }) {
  const suggestions = useSuggestions(profileId);

  if (suggestions.isPending) return <ListSkeleton />;
  if (suggestions.isError) {
    return (
      <LoadError message={suggestions.error.message} onRetry={() => suggestions.refetch()} />
    );
  }

  const { exercises, profile_name: profileName } = suggestions.data;
  if (exercises.length === 0) {
    return (
      <p className="text-body text-foreground">
        Ingen øvelser passer med utstyret i «{profileName}». Legg til utstyr under{" "}
        <ProfilLink />.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupByLevel(exercises).map((group) => {
        const headingId = `level-${group.level}-heading`;
        return (
          <section
            key={group.level}
            aria-labelledby={headingId}
            className="flex flex-col gap-2 rounded-lg bg-card p-4 shadow-sm"
          >
            <h2 id={headingId} className="text-heading font-medium text-foreground">
              {levelLabel(group.level)}
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
                      {exercise.primary_muscle_group} · {exercise.equipment.join(", ")}
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

function CountLine({ profileId }: { profileId: string }) {
  const suggestions = useSuggestions(profileId);
  // Polite live region: switching profile announces the new count.
  return (
    <p aria-live="polite" className="min-h-6 text-body text-foreground">
      {suggestions.data && suggestions.data.exercises.length > 0
        ? countText(suggestions.data.exercises.length, suggestions.data.profile_name)
        : ""}
    </p>
  );
}

function ProfilLink() {
  return (
    <Link href="/profil" className={LINK_CLASS}>
      Profil → Utstyr
    </Link>
  );
}

/**
 * Trening (story 4.3): an Equipment Profile switch and the exercises that fit it,
 * grouped by level. The choice is remembered per browser and user; else the first profile.
 */
export function Suggestions() {
  const me = useMe();
  const profiles = useEquipmentProfiles();
  const userId = me.data?.id;
  // Chosen on this page; until then the stored choice (null if none or storage blocked).
  const [chosenId, setChosenId] = useState<string | null>(null);
  const storedId = useMemo(() => (userId ? readStoredProfileId(userId) : null), [userId]);

  function choose(id: string) {
    setChosenId(id);
    if (userId) storeProfileId(userId, id);
  }

  let content;
  if (profiles.isError) {
    content = <LoadError message={profiles.error.message} onRetry={() => profiles.refetch()} />;
  } else if (profiles.isPending || me.isPending) {
    // Wait for the user too, so the stored choice (per user) is known before rendering.
    content = <ListSkeleton />;
  } else if (profiles.data.length === 0) {
    content = (
      <p className="text-body text-foreground">
        Du har ingen utstyrsprofiler ennå. Lag en under <ProfilLink />.
      </p>
    );
  } else {
    // A chosen or stored id that is gone (deleted elsewhere) falls back to the first.
    const selected =
      profiles.data.find((profile) => profile.id === chosenId) ??
      profiles.data.find((profile) => profile.id === storedId) ??
      profiles.data[0];
    content = (
      <>
        <ProfileSwitch profiles={profiles.data} selectedId={selected.id} onChange={choose} />
        <CountLine profileId={selected.id} />
        <SuggestionList profileId={selected.id} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Velg utstyret du har. Trykk på en øvelse for å se hvordan du gjør den.
      </p>
      {content}
    </div>
  );
}
