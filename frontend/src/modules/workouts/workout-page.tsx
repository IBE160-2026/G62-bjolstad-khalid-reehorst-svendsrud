"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { UndoToast, type UndoToastState } from "@/components/undo-toast";
import { exercisePath } from "@/modules/exercises/api";
import { ListSkeleton, LoadError } from "@/modules/exercises/list-parts";
import { LINK_CLASS, SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import {
  lastTimeText,
  MAX_SETS,
  moveId,
  useActiveWorkout,
  useAddSet,
  useDeleteSet,
  useRemoveWorkoutExercise,
  useReorderWorkoutExercises,
  useUpdateSet,
  workoutDateText,
  type SetValues,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from "./api";
import { ICON_BUTTON_CLASS, SetRow } from "./set-row";

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
  workoutDate,
  first,
  last,
  busy,
  onAction,
  buttonRef,
  children,
}: {
  exercise: WorkoutExercise;
  workoutDate: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  onAction: (action: Action) => void;
  buttonRef: (action: Action) => (element: HTMLButtonElement | null) => void;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 py-2" data-exercise={exercise.id}>
      <div className="flex items-center gap-2">
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
      </div>
      {/* What the user did last time (story 5.3); outside the link to keep its name short. */}
      <p data-testid="last-time" className="px-2 text-small text-muted-foreground">
        {lastTimeText(exercise.last_time, workoutDate)}
      </p>
      {children}
    </li>
  );
}

/** The sets of one exercise (story 5.2) with "Legg til sett" under the rows. */
function SetList({
  exercise,
  adding,
  onSave,
  onDelete,
  onAdd,
}: {
  exercise: WorkoutExercise;
  adding: boolean;
  onSave: (set: WorkoutSet, values: Partial<SetValues>) => Promise<unknown>;
  onDelete: (set: WorkoutSet) => void;
  onAdd: () => void;
}) {
  const time = exercise.type === "time";
  const full = exercise.sets.length >= MAX_SETS;
  return (
    <div className="flex flex-col gap-1">
      {exercise.sets.length > 0 ? (
        <>
          {/* Column headings for sighted users; each field has its own aria-label. */}
          <div aria-hidden="true" className="flex items-center gap-2 px-2 text-small text-muted-foreground">
            <span className="w-16 shrink-0" />
            <span className="min-w-0 flex-1">{time ? "Sekunder" : "Repetisjoner"}</span>
            {time ? null : <span className="min-w-0 flex-1">Kg</span>}
            <span className="w-11 shrink-0 text-center">Ferdig</span>
            <span className="w-11 shrink-0" />
          </div>
          <ul aria-label={`Sett for ${exercise.name}`} className="flex flex-col gap-1">
            {exercise.sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                type={exercise.type}
                exerciseName={exercise.name}
                onSave={(values) => onSave(set, values)}
                onDelete={() => onDelete(set)}
              />
            ))}
          </ul>
        </>
      ) : null}
      <button
        type="button"
        data-add-set
        aria-label={`Legg til sett, ${exercise.name}`}
        disabled={adding || full}
        onClick={onAdd}
        className={`inline-flex items-center self-start ${SECONDARY_BUTTON_CLASS}`}
      >
        Legg til sett
      </button>
      {full ? (
        <p className="text-small text-muted-foreground">Du kan ha opptil 20 sett per øvelse.</p>
      ) : null}
    </div>
  );
}

type SetToast = UndoToastState & { set: WorkoutSet; workoutExerciseId: string };

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

  // --- Sets (story 5.2) ---
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const restoreSet = useAddSet();
  const [setError, setSetError] = useState<string | null>(null);
  const [toast, setToast] = useState<SetToast | null>(null);
  const toastKey = useRef(0);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  // "Sett 2 er tilbake." after a successful "Angre".
  const [toastAnnouncement, setToastAnnouncement] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  // After a delete: focus the row now in the deleted one's place (its "Slett"), else
  // that exercise's "Legg til sett".
  // After "Angre": the restored row's first field (`setId`), once it has rendered.
  const setFocus = useRef<{ exerciseId: string; index: number; setId?: string } | null>(null);
  // Bumped when a focus target is set, so the effect runs even if the workout rendered first.
  const [focusTick, setFocusTick] = useState(0);
  // Set at the first tap on "Slett", so a double tap cannot delete two sets.
  const deleting = useRef(false);

  useEffect(() => {
    const pending = setFocus.current;
    if (pending === null) return;
    const item = list.current?.querySelector(`[data-exercise="${pending.exerciseId}"]`);
    if (!item) return;
    if (pending.setId) {
      const input = item.querySelector<HTMLElement>(`[data-set-id="${pending.setId}"] input`);
      if (!input) return; // not rendered yet
      setFocus.current = null;
      input.focus();
      return;
    }
    setFocus.current = null;
    const rows = item.querySelectorAll<HTMLElement>('[data-testid="set-row"] button');
    const next = rows[pending.index] ?? rows[rows.length - 1];
    (next ?? item.querySelector<HTMLButtonElement>("[data-add-set]"))?.focus();
  }, [workout, focusTick]);

  // A failed "Angre": focus the alert that says so.
  useEffect(() => {
    if (restoreError) document.querySelector<HTMLElement>("[data-undo-error]")?.focus();
  }, [restoreError]);

  function showSetError(error: unknown) {
    setSetError(error instanceof Error ? error.message : String(error));
  }

  function saveSet(set: WorkoutSet, values: Partial<SetValues>) {
    setSetError(null);
    return updateSet.mutateAsync({ workoutId: workout.id, setId: set.id, body: values });
  }

  function addEmptySet(exercise: WorkoutExercise) {
    setSetError(null);
    addSet.mutate(
      { workoutId: workout.id, workoutExerciseId: exercise.id },
      { onError: showSetError },
    );
  }

  function removeSet(exercise: WorkoutExercise, set: WorkoutSet) {
    if (deleting.current) return;
    deleting.current = true;
    setSetError(null);
    setRestoreError(null);
    setToastAnnouncement(null);
    toastKey.current += 1;
    // One toast at a time: a second delete replaces the first.
    setToast({
      key: toastKey.current,
      name: `Sett ${set.position + 1}`,
      set,
      workoutExerciseId: exercise.id,
    });
    setFocus.current = { exerciseId: exercise.id, index: set.position };
    deleteSet.mutate(
      { workoutId: workout.id, setId: set.id },
      {
        onError: (error) => {
          // Nothing was deleted, so there is nothing to undo.
          setToast((current) => (current?.set.id === set.id ? null : current));
          showSetError(error);
        },
        onSettled: () => {
          deleting.current = false;
        },
      },
    );
  }

  function undoDelete() {
    if (!toast) return;
    const { set, name, workoutExerciseId } = toast;
    restoreSet.mutate(
      {
        workoutId: workout.id,
        workoutExerciseId,
        body: {
          reps: set.reps,
          weight_kg: set.weight_kg,
          seconds: set.seconds,
          done: set.done,
          position: set.position,
        },
      },
      {
        onSuccess: (saved) => {
          setToast(null);
          setToastAnnouncement(`${name} er tilbake.`);
          const exercise = saved.exercises.find((item) => item.id === workoutExerciseId);
          const restored = exercise?.sets[Math.min(set.position, exercise.sets.length - 1)];
          if (restored) {
            setFocus.current = { exerciseId: workoutExerciseId, index: 0, setId: restored.id };
            setFocusTick((tick) => tick + 1);
          }
        },
        onError: () => {
          setToast(null);
          setRestoreError(
            `Vi fikk ikke hentet tilbake ${name.toLowerCase()}. Legg det til på nytt med Legg til sett.`,
          );
        },
      },
    );
  }

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
    // Room at the bottom so the toast never covers the last buttons.
    <div className={`flex flex-col gap-6 ${toast || restoreError ? "pb-24" : ""}`}>
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
          ref={list}
          aria-label="Øvelser i økta"
          className="-mx-2 flex flex-col divide-y divide-border rounded-lg bg-card px-2 shadow-sm"
        >
          {workout.exercises.map((exercise, index) => (
            <Row
              key={exercise.id}
              exercise={exercise}
              workoutDate={workout.date}
              first={index === 0}
              last={index === workout.exercises.length - 1}
              busy={busy}
              onAction={(action) => act(index, action)}
              buttonRef={buttonRef(exercise.id)}
            >
              <SetList
                exercise={exercise}
                adding={addSet.isPending}
                onSave={saveSet}
                onDelete={(set) => removeSet(exercise, set)}
                onAdd={() => addEmptySet(exercise)}
              />
            </Row>
          ))}
        </ol>
      )}

      {error ? (
        <p role="alert" className="text-body text-destructive">
          {error.message}
        </p>
      ) : null}
      {setError ? (
        <p role="alert" className="text-body text-destructive">
          {setError}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <AddExerciseLink />

      <UndoToast
        toast={toast}
        restoring={restoreSet.isPending}
        announcement={toastAnnouncement}
        paused={false}
        error={restoreError}
        onUndo={undoDelete}
        onTimeout={() => setToast(null)}
        onDismissError={() => setRestoreError(null)}
      />
    </div>
  );
}

/** Økt (stories 5.1-5.3): the workout in progress with its exercises, their sets and what
 * the user did last time. */
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
