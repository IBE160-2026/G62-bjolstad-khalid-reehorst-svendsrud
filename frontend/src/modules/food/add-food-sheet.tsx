"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { INPUT_CLASS } from "@/modules/identity/styles";
import { formatKcal } from "@/modules/profile/target-result";

import { SEARCH_MIN_LENGTH, useFoodSearch, type FoodItem } from "./api";
import { AmountPicker } from "./amount-picker";
import { MatvaretabellenAttribution } from "./attribution";
import type { Meal } from "./meals";

const TITLE_ID = "add-food-title";
const SEARCH_ID = "food-search";
const SEARCH_DELAY_MS = 200;

const METHODS = [
  { id: "search", label: "Søk", enabled: true },
  { id: "barcode", label: "Skriv strekkode", enabled: false },
  { id: "recent", label: "Nylig brukt", enabled: false },
  { id: "manual", label: "Manuelt", enabled: false },
] as const;

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function MethodPicker() {
  return (
    <div
      role="tablist"
      aria-label="Velg hvordan du legger til"
      className="flex flex-wrap gap-2"
    >
      {METHODS.map((method) =>
        method.enabled ? (
          <button
            key={method.id}
            type="button"
            role="tab"
            aria-selected="true"
            aria-controls="add-food-panel"
            className="min-h-11 rounded-full bg-primary px-4 text-small font-medium text-primary-foreground"
          >
            {method.label}
          </button>
        ) : (
          <button
            key={method.id}
            type="button"
            role="tab"
            aria-selected="false"
            disabled
            className="flex min-h-11 flex-col items-center justify-center rounded-full border-[1.5px] border-border px-4 text-small text-muted-foreground opacity-70"
          >
            <span>{method.label}</span>
            <span className="text-label">Kommer snart</span>
          </button>
        ),
      )}
    </div>
  );
}

function SearchPanel({
  query,
  setQuery,
  onPick,
}: {
  query: string;
  setQuery: (query: string) => void;
  onPick: (item: FoodItem) => void;
}) {
  const [highlighted, setHighlighted] = useState(0);
  const debounced = useDebounced(query, SEARCH_DELAY_MS);
  const search = useFoodSearch(debounced);
  const listId = useId();
  const tooShort = query.trim().length < SEARCH_MIN_LENGTH;
  const results = !tooShort && search.data ? search.data : [];
  // Shown results may lag the typed query (debounce, previous data kept while fetching).
  const resultsCurrent =
    debounced.trim() === query.trim() &&
    !search.isPlaceholderData &&
    !search.isFetching;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never pick from results that belong to an earlier query.
      event.preventDefault();
      if (resultsCurrent && results.length > 0) {
        onPick(results[Math.min(highlighted, results.length - 1)]);
      }
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    }
  }

  let status: ReactNode = null;
  if (tooShort) {
    status = (
      <p className="text-small text-muted-foreground">
        Skriv minst to bokstaver.
      </p>
    );
  } else if (search.isError) {
    status = (
      <p role="alert" className="text-small text-destructive">
        {search.error.message}
      </p>
    );
  } else if (search.data === undefined) {
    // Only the very first search shows skeletons; later ones keep the previous results.
    status = (
      <ul
        aria-hidden="true"
        className="flex flex-col gap-2"
        data-testid="search-skeleton"
      >
        {[0, 1, 2].map((row) => (
          <li key={row} className="h-12 animate-pulse rounded-sm bg-muted" />
        ))}
      </ul>
    );
  } else if (results.length === 0) {
    status = (
      <div role="status" className="flex flex-col gap-1">
        <p className="text-body font-medium text-foreground">Ingen treff</p>
        <p className="text-small text-muted-foreground">Prøv et annet ord.</p>
      </div>
    );
  }
  const listShown = status === null;
  const active = Math.min(highlighted, results.length - 1);

  return (
    <div id="add-food-panel" role="tabpanel" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor={SEARCH_ID}
          className="text-small font-medium text-foreground"
        >
          Søk etter matvare
        </label>
        <input
          id={SEARCH_ID}
          type="search"
          role="combobox"
          autoComplete="off"
          maxLength={100}
          // Focused on open by the sheet; autoFocus covers the first render.
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={listShown}
          aria-controls={listShown ? listId : undefined}
          aria-activedescendant={listShown ? optionId(active) : undefined}
          className={INPUT_CLASS}
        />
      </div>
      {status ?? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Treff"
          className="flex flex-col gap-1"
        >
          {results.map((item, index) => (
            <li
              key={item.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => onPick(item)}
              // Keep focus in the search field when a result is clicked.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-body text-foreground hover:bg-mark-tint aria-selected:bg-mark-tint"
            >
              <span>{item.name}</span>
              <span className="shrink-0 text-small text-muted-foreground tabular-nums">
                {formatKcal(item.kcal_per_100g)} kcal/100 g
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Legg til mat" (story 3.1): a native `<dialog>` opened with `showModal()`; focus moves
 * in, Esc closes and the opener gets focus back. Only Søk is active in this story.
 */
export function AddFoodSheet({
  open,
  meal,
  date,
  onClose,
}: {
  open: boolean;
  meal: Meal;
  date: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  // Kept here so "Tilbake til søket" returns to the same results.
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.getElementById(SEARCH_ID)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={() => {
        setPicked(null);
        setQuery("");
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)] max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
    >
      {open && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2
              id={TITLE_ID}
              className="text-heading font-semibold text-foreground"
            >
              Legg til mat
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Lukk"
              className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          {picked ? (
            <AmountPicker
              item={picked}
              date={date}
              initialMeal={meal}
              onBack={() => setPicked(null)}
              onSaved={close}
            />
          ) : (
            <>
              <MethodPicker />
              <SearchPanel
                query={query}
                setQuery={setQuery}
                onPick={setPicked}
              />
            </>
          )}
          <MatvaretabellenAttribution />
        </div>
      )}
    </dialog>
  );
}
