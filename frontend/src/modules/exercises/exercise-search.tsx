"use client";

import { X } from "lucide-react";
import { useRef } from "react";

import { INPUT_CLASS } from "@/modules/identity/styles";

import {
  EXERCISE_SEARCH_MAX_LENGTH,
  useExerciseSearch,
  type ExerciseSearchItem,
} from "./api";
import { ExerciseRow, ListSkeleton, LoadError } from "./list-parts";

export const EXERCISE_SEARCH_ID = "exercise-search";
const HINT_ID = "exercise-search-hint";
/** Wait this long after the last keystroke before searching. */
export const EXERCISE_SEARCH_DELAY_MS = 300;

export const NO_MATCH_TEXT =
  "Ingen øvelser heter det. Sjekk stavemåten, eller prøv et kortere ord.";

export function hitsText(count: number, profileName: string): string {
  return `${count} treff for ${profileName}`;
}

/** "Mangler: Stang og skiver" for an exercise that does not fit; null when it fits. */
export function missingText(item: ExerciseSearchItem): string | null {
  if (item.fits) return null;
  return `Mangler: ${item.missing_equipment.join(", ")}`;
}

/** The name search field with a "Tøm søket" button while it has text. */
export function ExerciseSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={EXERCISE_SEARCH_ID} className="text-small font-medium text-foreground">
        Søk etter øvelse
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={EXERCISE_SEARCH_ID}
          // Not type="search": the browser's own clear button would sit beside ours.
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={EXERCISE_SEARCH_MAX_LENGTH}
          aria-describedby={HINT_ID}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        />
        {value !== "" && (
          <button
            type="button"
            aria-label="Tøm søket"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      <p id={HINT_ID} className="text-small text-muted-foreground">
        Skriv minst 2 bokstaver.
      </p>
    </div>
  );
}

/**
 * Search results for one profile (story 4.4): flat, fitting first (the backend's order),
 * with "Mangler: …" on rows that do not fit. They still link to the detail page. While a
 * new profile or query loads, the previous results stay, dimmed and marked busy.
 */
export function ExerciseSearchResults({
  profileId,
  query,
}: {
  profileId: string;
  query: string;
}) {
  const search = useExerciseSearch(profileId, query);

  // One persistent status region; only its text changes.
  let statusText = "";
  let content = null;
  if (search.isPending) {
    content = <ListSkeleton testId="exercise-search-skeleton" />;
  } else if (search.isError) {
    // Only the error: no stale count or results beside it.
    content = <LoadError message={search.error.message} onRetry={() => search.refetch()} />;
  } else if (search.data.exercises.length === 0) {
    statusText = NO_MATCH_TEXT;
  } else {
    const stale = search.isPlaceholderData;
    statusText = hitsText(search.data.exercises.length, search.data.profile_name);
    content = (
      <section
        aria-label="Søkeresultat"
        aria-busy={stale}
        className={`rounded-lg bg-card p-4 shadow-sm transition-opacity ${stale ? "opacity-60" : ""}`}
      >
        <ul className="-mx-2 flex flex-col divide-y divide-border">
          {search.data.exercises.map((exercise) => {
            const missing = missingText(exercise);
            return (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                extra={
                  missing && <span className="text-small text-muted-foreground">{missing}</span>
                }
              />
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <>
      <p role="status" className="min-h-6 text-body text-foreground">
        {statusText}
      </p>
      {content}
    </>
  );
}
