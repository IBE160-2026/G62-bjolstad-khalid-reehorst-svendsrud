"use client";

import { SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { useRecentFoods, type RecentFood } from "./api";
import { OffAttribution } from "./attribution";
import { formatGrams, mealLabel } from "./meals";

/**
 * "Nylig brukt" (story 3.4): the user's 10 most recently logged distinct items, newest
 * first. A tap opens the amount picker prefilled; nothing is saved without "Lagre".
 */
export function RecentPanel({
  panelId,
  labelledBy,
  onPick,
  onSearch,
}: {
  panelId: string;
  labelledBy: string;
  onPick: (item: RecentFood) => void;
  onSearch: () => void;
}) {
  const recent = useRecentFoods();

  const searchButton = (focusFirst: boolean) => (
    <button
      type="button"
      onClick={onSearch}
      autoFocus={focusFirst}
      data-recent-focus={focusFirst ? "" : undefined}
      className={SECONDARY_BUTTON_CLASS}
    >
      Søk etter mat
    </button>
  );

  let content;
  if (recent.data === undefined && recent.isError) {
    // Cached items stay visible after a failed refetch; this shows only without data.
    content = (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-small text-destructive">
          {recent.error.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void recent.refetch()}
            className={SECONDARY_BUTTON_CLASS}
          >
            Prøv igjen
          </button>
          {searchButton(false)}
        </div>
      </div>
    );
  } else if (recent.data === undefined) {
    content = (
      <ul
        aria-hidden="true"
        className="flex flex-col gap-2"
        data-testid="recent-skeleton"
      >
        {[0, 1, 2].map((row) => (
          <li key={row} className="h-12 animate-pulse rounded-sm bg-muted" />
        ))}
      </ul>
    );
  } else if (recent.data.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body text-foreground">
          Du har ikke logget noe ennå.
        </p>
        {searchButton(true)}
      </div>
    );
  } else {
    content = (
      <>
        <ul aria-label="Nylig brukt" className="flex flex-col gap-1">
          {recent.data.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                // The first row takes focus when the sheet opens here.
                autoFocus={index === 0}
                data-recent-focus={index === 0 ? "" : undefined}
                className="flex min-h-12 w-full flex-col items-start justify-center gap-0.5 rounded-sm px-3 py-2 text-left hover:bg-mark-tint focus-visible:bg-mark-tint"
              >
                <span className="text-body text-foreground">{item.name}</span>
                <span className="text-small text-muted-foreground tabular-nums">
                  {formatGrams(item.last_grams)} g · {mealLabel(item.last_meal)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {recent.data.some((item) => item.source === "off") && (
          <OffAttribution />
        )}
      </>
    );
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-4"
    >
      {content}
    </div>
  );
}
