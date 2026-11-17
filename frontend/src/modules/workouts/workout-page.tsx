"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { exercisePath } from "@/modules/exercises/api";
import { ListSkeleton, LoadError } from "@/modules/exercises/list-parts";
import { LINK_CLASS, SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import {
  moveId,
  useActiveWorkout,
  useRemoveWorkoutExercise,
  useReorderWorkoutExercises,
  workoutDateText,
  type Workout,
  type WorkoutExercise,
} from "./api";

const ICON_BUTTON_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-70";

type Action = "up" | "down" | "remove";

/** Where focus goes once the server's answer has rendered: a row's button, or the
 * heading. `order` is the answer's ids, so focus waits until that list is on screen;
 * null (after an error) means as soon as the buttons are enabled again. */
type FocusTarget = {
  target: { id: string; action: Action } | "heading";
  order: string | null;
} | null;

function orderOf(workout: Workout): string {
  return workout.exercises.map((exercise) => exercise.id).join(",");
}

function AddExerciseLink() {
  return (
    <Link href="/trening" className={`inline-flex items-center self-start ${SECONDARY_BUTTON_CLASS}`}>
      Legg til øvelse
    </Link>
  );
}

function Row({
  exercise,
  first,
  last,
  busy,
  onAction,
  buttonRef,
}: {
  exercise: WorkoutExercise;
  first: boolean;
  last: boolean;
  busy: boolean;
  onAction: (action: Action) => void;
  buttonRef: (action: Action) => (element: HTMLButtonElement | null) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-2">
      <Link
        href={exercisePath(exercise.exercise_id)}
        className="flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 rounded-sm px-2 py-1 hover:bg-muted"
      >
        <span className="text-body text-foreground">{exercise.name}</span>
        <span className="text-small text-muted-foreground">
          {exercise.primary_muscle_group} · {exercise.equipment.join(", ")}
        </span>
      </Link>
      {/* Hidden at the ends; an invisible placeholder keeps the buttons aligned. */}
      {first ? (
        <span aria-hidden="true" className="size-11 shrink-0" />
      ) : (
        <button
          ref={buttonRef("up")}
          type="button"
          aria-label={`Flytt opp: ${exercise.name}`}
          title="Flytt opp"
          className={ICON_BUTTON_CLASS}
          disabled={busy}
          onClick={() => onAction("up")}
        >
          <ArrowUp aria-hidden="true" className="size-5" />
        </button>
      )}
      {last ? (
        <span aria-hidden="true" className="size-11 shrink-0" />
      ) : (
        <button
          ref={buttonRef("down")}
          type="button"
          aria-label={`Flytt ned: ${exercise.name}`}
          title="Flytt ned"
          className={ICON_BUTTON_CLASS}
          disabled={busy}
          onClick={() => onAction("down")}
        >
          <ArrowDown aria-hidden="true" className="size-5" />
        </button>
      )}
      <button
        ref={buttonRef("remove")}
        type="button"
        aria-label={`Fjern ${exercise.name}`}
        title="Fjern"
        className={ICON_BUTTON_CLASS}
        disabled={busy}
        onClick={() => onAction("remove")}
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}

function WorkoutView({ workout }: { workout: Workout }) {
  const reorder = useReorderWorkoutExercises();
  const remove = useRemoveWorkoutExercise();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  // A ref, not state: set when the server answers, used once that answer has rendered.
  const focusTarget = useRef<FocusTarget>(null);
  // Bumped with every answer, so the effect below runs even when nothing else changed
  // (a quick failure can leave both `workout` and `busy` as they were).
  const [answers, setAnswers] = useState(0);
  const busy = reorder.isPending || remove.isPending;
  const error = reorder.error ?? remove.error;
  // Read out after a move, e.g. "Planke (Plank) flyttet til plass 1 av 3."
  const [announcement, setAnnouncement] = useState("");

  // After the new order or list has rendered and the buttons are enabled again, put
  // focus back where the user was (a disabled button cannot take focus).
  useEffect(() => {
    const pending = focusTarget.current;
    if (pending === null || busy) return;
    if (pending.order !== null && pending.order !== orderOf(workout)) return;
    focusTarget.current = null;
    if (pending.target === "heading") {
      heading.current?.focus();
    } else {
      const { id, action } = pending.target;
      // The moved row's button; at an end that button is gone, so use the other one.
      const fallback: Action = action === "up" ? "down" : "up";
      (buttons.current.get(`${id}:${action}`) ?? buttons.current.get(`${id}:${fallback}`))?.focus();
    }
  }, [workout, busy, answers]);

  function buttonRef(id: string) {
    return (action: Action) => (element: HTMLButtonElement | null) => {
      const key = `${id}:${action}`;
      if (element) buttons.current.set(key, element);
      else buttons.current.delete(key);
    };
  }

  function act(index: number, action: Action) {
    const exercise = workout.exercises[index];
    const ids = workout.exercises.map((item) => item.id);
    // On failure, focus goes back to the pressed button (it was disabled meanwhile).
    const onError = () => {
      focusTarget.current = { target: { id: exercise.id, action }, order: null };
      setAnswers((count) => count + 1);
    };
    // Only the latest action's error is shown.
    reorder.reset();
    remove.reset();
    setAnnouncement("");
    if (action === "remove") {
      // Focus moves to the next row's "Fjern", else the previous one, else the heading.
      const neighbour = workout.exercises[index + 1] ?? workout.exercises[index - 1];
      remove.mutate(
        { workoutId: workout.id, id: exercise.id },
        {
          onSuccess: (saved) => {
            focusTarget.current = {
              target: neighbour ? { id: neighbour.id, action: "remove" } : "heading",
              order: orderOf(saved),
            };
            setAnswers((count) => count + 1);
          },
          onError,
        },
      );
      return;
    }
    reorder.mutate(
      { workoutId: workout.id, ids: moveId(ids, index, action === "up" ? -1 : 1) },
      {
        onSuccess: (saved) => {
          focusTarget.current = { target: { id: exercise.id, action }, order: orderOf(saved) };
          setAnswers((count) => count + 1);
          const place = saved.exercises.findIndex((item) => item.id === exercise.id) + 1;
          setAnnouncement(
            `${exercise.name} flyttet til plass ${place} av ${saved.exercises.length}.`,
          );
        },
        onError,
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-title font-medium text-foreground first-letter:uppercase focus:outline-none"
      >
        {workoutDateText(workout.date)}
      </h2>

      {workout.exercises.length === 0 ? (
        <p className="text-body text-foreground">Økta er tom. Legg til øvelser fra Trening.</p>
      ) : (
        <ol
          aria-label="Øvelser i økta"
          className="-mx-2 flex flex-col divide-y divide-border rounded-lg bg-card px-2 shadow-sm"
        >
          {workout.exercises.map((exercise, index) => (
            <Row
              key={exercise.id}
              exercise={exercise}
              first={index === 0}
              last={index === workout.exercises.length - 1}
              busy={busy}
              onAction={(action) => act(index, action)}
              buttonRef={buttonRef(exercise.id)}
            />
          ))}
        </ol>
      )}

      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error.message}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <AddExerciseLink />
    </div>
  );
}

/** Økt (story 5.1): the workout in progress with its exercises in order. */
export function WorkoutPage() {
  const active = useActiveWorkout();

  if (active.isPending) return <ListSkeleton testId="workout-skeleton" />;
  if (active.isError) {
    return <LoadError message={active.error.message} onRetry={() => active.refetch()} />;
  }
  if (active.data === null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body text-foreground">
          Du har ingen økt i gang. Start en fra{" "}
          <Link href="/trening" className={LINK_CLASS}>
            Trening
          </Link>
          .
        </p>
      </div>
    );
  }
  return <WorkoutView workout={active.data} />;
}
