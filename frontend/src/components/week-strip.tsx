"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Soup } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { addDays, datedHref, dayText, isRealDate, mondayOf } from "@/lib/selected-date";
import { useOverviewWeek, type WeekDay } from "@/modules/overview/api";

const SHORT_WEEKDAYS = ["ma", "ti", "on", "to", "fr", "lø", "sø"] as const;

export const FUTURE_MESSAGE = "Du kan ikke velge en dag fram i tid.";

const ARROW_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent";

/** "ma 16", the visible text of a day button. */
export function shortDayText(date: string): string {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return `${SHORT_WEEKDAYS[weekday]} ${Number(date.slice(8))}`;
}

/** Starts with the visible text: "to 19 i dag, torsdag 19. november, mat logget, trening
 * logget" (or "…, ingenting logget"). Without the week's marks (still loading) no marks. */
export function dayLabel(date: string, marks: WeekDay | undefined, today: string): string {
  const visible = `${shortDayText(date)}${date === today ? " i dag" : ""}`;
  const name = `${visible}, ${dayText(date, today)}`;
  if (!marks) return name;
  const parts = [marks.has_food && "mat logget", marks.has_workout && "trening logget"].filter(
    (part): part is string => Boolean(part),
  );
  return `${name}, ${parts.length > 0 ? parts.join(", ") : "ingenting logget"}`;
}

type Props = {
  /** The chosen date (YYYY-MM-DD). */
  date: string;
  /** Today in Europe/Oslo. */
  today: string;
  /** `?dato=` asked for a day after today; the page shows today and says why, once. */
  futureRequested?: boolean;
};

/**
 * The week strip (story 6.3) on I dag, Mat and Trening: Monday to Sunday of the chosen
 * date's week. Choosing a day sets `?dato=` (left out for today); future days are disabled.
 * ‹ › step a whole week; "Velg dato" opens a native date field (max today) for any earlier
 * date. The days are a toolbar: ← → move one day from the focused day (across weeks), Home
 * and End go to its Monday and Sunday.
 */
export function WeekStrip({ date, today, futureRequested = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const monday = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const week = useOverviewWeek(monday);
  const marks = new Map((week.data ?? []).map((day) => [day.date, day]));
  const toolbarRef = useRef<HTMLDivElement>(null);
  // The day to focus once it is the chosen one (after a keyboard move).
  const focusDateRef = useRef<string | null>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  // Shown once after a future `?dato=`, until another day is chosen. Filled after mount, so
  // the (always present) status region announces it.
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (!futureRequested) return;
    // Filled in a moment after the empty region is in place, so it is announced; not
    // cancelled when the address loses `?dato=` below.
    setTimeout(() => setNotice(true), 0);
    // Drop the future date from the address, so the message is not shown again.
    router.replace(pathname);
  }, [futureRequested, pathname, router]);

  useEffect(() => {
    if (focusDateRef.current !== date) return;
    focusDateRef.current = null;
    toolbarRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus();
  }, [date]);

  useEffect(() => {
    if (!pickerOpen) return;
    const input = pickerRef.current;
    input?.focus();
    try {
      input?.showPicker?.();
    } catch {
      // Not allowed or not supported: the field itself is still there.
    }
  }, [pickerOpen]);

  /** The API's `future` flag; the browser's date only while the week loads. */
  function isFuture(day: string): boolean {
    return marks.get(day)?.future ?? day > today;
  }

  function select(next: string) {
    if (isFuture(next)) return;
    setNotice(false);
    if (next !== date) router.push(datedHref(pathname, next, today));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Step from the focused day (the chosen one unless focus moved by other means).
    const focused =
      (event.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date ?? date;
    const focusedMonday = mondayOf(focused);
    const sunday = addDays(focusedMonday, 6);
    const targets: Record<string, string> = {
      ArrowLeft: addDays(focused, -1),
      ArrowRight: addDays(focused, 1),
      Home: focusedMonday,
      End: isFuture(sunday) ? today : sunday,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    if (isFuture(next)) return;
    if (next === date) {
      toolbarRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus();
      return;
    }
    focusDateRef.current = next;
    select(next);
  }

  const weekHasToday = monday === mondayOf(today);
  const nextWeek = addDays(date, 7);

  return (
    <div className="flex flex-col gap-2" data-testid="week-strip">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige uke"
          className={ARROW_CLASS}
          onClick={() => select(addDays(date, -7))}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Velg dag"
          onKeyDown={onKeyDown}
          className="grid min-w-0 flex-1 grid-cols-7 gap-1"
        >
          {days.map((day) => {
            const selected = day === date;
            const isToday = day === today;
            const dayMarks = marks.get(day);
            return (
              <button
                key={day}
                type="button"
                data-date={day}
                aria-label={dayLabel(day, dayMarks, today)}
                aria-pressed={selected}
                aria-current={isToday ? "date" : undefined}
                disabled={isFuture(day)}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(day)}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-start gap-0.5 rounded-md border-2 px-0.5 py-1 text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent ${
                  selected ? "border-foreground" : "border-transparent"
                }`}
              >
                <span className="text-label text-muted-foreground">
                  {shortDayText(day).split(" ")[0]}{" "}
                  <span className="text-body font-medium text-foreground tabular-nums">
                    {Number(day.slice(8))}
                  </span>
                </span>
                <span aria-hidden="true" className="flex h-3 items-center gap-0.5 text-mark">
                  {dayMarks?.has_food && <Soup className="size-3" />}
                  {dayMarks?.has_workout && <Dumbbell className="size-3" />}
                </span>
                {isToday && (
                  <span aria-hidden="true" className="text-label text-muted-foreground">
                    i dag
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Neste uke"
          className={ARROW_CLASS}
          disabled={weekHasToday}
          onClick={() => select(nextWeek > today ? today : nextWeek)}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
        <button
          ref={pickerButtonRef}
          type="button"
          aria-label="Velg dato"
          aria-expanded={pickerOpen}
          className={ARROW_CLASS}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <CalendarDays aria-hidden="true" className="size-5" />
        </button>
      </div>
      {pickerOpen && (
        <form
          className="flex flex-wrap items-end justify-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = pickerRef.current?.value ?? "";
            if (!isRealDate(value)) {
              setPickerError("Velg en dato.");
              return;
            }
            if (value > today) {
              setPickerError(FUTURE_MESSAGE);
              return;
            }
            setPickerOpen(false);
            setPickerError(null);
            select(value);
          }}
        >
          <label className="flex flex-col gap-1 text-small text-foreground">
            Dato
            <input
              ref={pickerRef}
              type="date"
              max={today}
              defaultValue={date}
              aria-invalid={pickerError !== null}
              aria-describedby={pickerError ? "week-strip-date-error" : undefined}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                setPickerOpen(false);
                setPickerError(null);
                pickerButtonRef.current?.focus();
              }}
              className="h-11 rounded-sm border-[1.5px] border-input bg-card px-3 text-body text-foreground"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-full border-[1.5px] border-border bg-card px-4 text-button font-medium text-foreground hover:bg-muted"
          >
            Vis dagen
          </button>
          {pickerError && (
            <p id="week-strip-date-error" className="w-full text-right text-small text-destructive">
              {pickerError}
            </p>
          )}
        </form>
      )}
      <p role="status" className="text-body text-foreground empty:hidden">
        {notice ? FUTURE_MESSAGE : ""}
      </p>
    </div>
  );
}
