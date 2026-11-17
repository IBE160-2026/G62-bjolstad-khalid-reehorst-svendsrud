"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { WeekStrip } from "@/components/week-strip";
import { useSelectedDate } from "@/lib/selected-date";
import { useDebounced } from "@/lib/use-debounced";
import { useMe } from "@/modules/identity/api";
import { LINK_CLASS } from "@/modules/identity/styles";
import { RecentWorkouts } from "@/modules/workouts/recent-workouts";
import { StartWorkout } from "@/modules/workouts/start-workout";

import {
  EXERCISE_SEARCH_MIN_LENGTH,
  NO_FILTERS,
  filterLabels,
  levelLabel,
  searchLength,
  readStoredProfileId,
  storeProfileId,
  useEquipmentProfiles,
  useSuggestions,
  type ExerciseListItem,
  type Level,
  type SuggestionFilters,
} from "./api";
import {
  EXERCISE_SEARCH_DELAY_MS,
  ExerciseSearchField,
  ExerciseSearchResults,
} from "./exercise-search";
import { SuggestionFilterBar } from "./filters";
import { ExerciseRow, ListSkeleton, LoadError } from "./list-parts";
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

/** "3 øvelser passer med Hjemme · Bryst · Nybegynner"; filter labels are optional. */
export function countText(count: number, profileName: string, filters: string[] = []): string {
  const what = [profileName, ...filters].join(" · ");
  return `${count} ${count === 1 ? "øvelse passer" : "øvelser passer"} med ${what}`;
}

/** "Hjemme", "Hjemme og Skuldre", "Hjemme, Skuldre og Øvet". */
function joinWithOg(parts: string[]): string {
  return parts.length < 2
    ? parts.join("")
    : `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

/** The empty message when filters are on: names the profile and every active filter,
 * and suggests changing what is active. */
export function emptyFilteredText(profileName: string, filters: SuggestionFilters): string {
  const hint =
    filters.muscleGroup && filters.level
      ? "Prøv en annen muskelgruppe eller et annet nivå."
      : filters.muscleGroup
        ? "Prøv en annen muskelgruppe eller legg til utstyr."
        : "Prøv et annet nivå eller legg til utstyr.";
  return `Ingen øvelser passer med ${joinWithOg([profileName, ...filterLabels(filters)])}. ${hint}`;
}

type ListProps = { profileId: string; filters: SuggestionFilters };

function SuggestionList({ profileId, filters }: ListProps) {
  const suggestions = useSuggestions(profileId, filters);

  if (suggestions.isPending) return <ListSkeleton />;
  if (suggestions.isError) {
    return (
      <LoadError message={suggestions.error.message} onRetry={() => suggestions.refetch()} />
    );
  }

  const { exercises, profile_name: profileName } = suggestions.data;
  const filtered = filterLabels(suggestions.data.filters).length > 0;
  // Dimmed and busy while a newly chosen profile or filter loads (as search, 4.4).
  const stale = suggestions.isPlaceholderData;
  const dim = `transition-opacity ${stale ? "opacity-60" : ""}`;
  if (exercises.length === 0) {
    return (
      <div aria-busy={stale} className={dim}>
        <p role="status" className="text-body text-foreground">
          {filtered
            ? `${emptyFilteredText(profileName, suggestions.data.filters)} Utstyret ditt finner du under `
            : `Ingen øvelser passer med utstyret i «${profileName}». Legg til utstyr under `}
          <ProfilLink />.
        </p>
      </div>
    );
  }

  return (
    <div aria-busy={stale} className={`flex flex-col gap-6 ${dim}`}>
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
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CountLine({ profileId, filters }: ListProps) {
  const suggestions = useSuggestions(profileId, filters);
  // Polite live region: switching profile announces the new count.
  return (
    <p aria-live="polite" className="min-h-6 text-body text-foreground">
      {suggestions.data && suggestions.data.exercises.length > 0
        ? countText(
            suggestions.data.exercises.length,
            suggestions.data.profile_name,
            filterLabels(suggestions.data.filters),
          )
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
 * A name search (story 4.4) replaces the list with results from the whole exercise list
 * while it has at least 2 characters. Muscle group and level filters (story 4.5) narrow
 * the suggestions; they stay when the profile changes, are hidden while searching and are
 * not remembered across reloads. The week strip (story 6.3) picks the date "Start økt" uses.
 */
export function Suggestions() {
  const { date, today, isToday, futureRequested } = useSelectedDate();
  const me = useMe();
  const profiles = useEquipmentProfiles();
  const userId = me.data?.id;
  // Chosen on this page; until then the stored choice (null if none or storage blocked).
  const [chosenId, setChosenId] = useState<string | null>(null);
  const storedId = useMemo(() => (userId ? readStoredProfileId(userId) : null), [userId]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SuggestionFilters>(NO_FILTERS);
  const debounced = useDebounced(query, EXERCISE_SEARCH_DELAY_MS);
  // Under 2 characters (also at once when cleared) the suggestions show. Otherwise the
  // view only changes once the debounced query has caught up with the typed one; until
  // then the current view stays, so results for an old query never flash back.
  const [searching, setSearching] = useState(false);
  const longEnough = searchLength(query) >= EXERCISE_SEARCH_MIN_LENGTH;
  const settled = debounced.trim() === query.trim();
  const nextSearching = !longEnough ? false : settled ? true : searching;
  if (nextSearching !== searching) setSearching(nextSearching);

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
        <ExerciseSearchField value={query} onChange={setQuery} />
        {nextSearching ? (
          <ExerciseSearchResults profileId={selected.id} query={debounced} />
        ) : (
          <>
            <SuggestionFilterBar filters={filters} onChange={setFilters} />
            <CountLine profileId={selected.id} filters={filters} />
            <SuggestionList profileId={selected.id} filters={filters} />
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {date !== null && today !== null && (
        <WeekStrip date={date} today={today} futureRequested={futureRequested} />
      )}
      <StartWorkout date={isToday ? null : date} />
      <RecentWorkouts />
      <p className="text-body text-foreground">
        Velg utstyret du har. Trykk på en øvelse for å se hvordan du gjør den.
      </p>
      {content}
    </div>
  );
}
