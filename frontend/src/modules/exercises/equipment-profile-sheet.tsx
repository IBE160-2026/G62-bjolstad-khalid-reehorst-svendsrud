"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "@/modules/identity/api";
import {
  DESTRUCTIVE_BUTTON_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SECONDARY_DESTRUCTIVE_BUTTON_CLASS,
} from "@/modules/identity/styles";

import {
  BODYWEIGHT_SLUG,
  useCreateEquipmentProfile,
  useDeleteEquipmentProfile,
  useEquipment,
  useUpdateEquipmentProfile,
  type EquipmentProfile,
} from "./api";

const TITLE_ID = "equipment-profile-title";
const NAME_ID = "equipment-profile-name";
const NAME_ERROR_ID = "equipment-profile-name-error";
const EQUIPMENT_ERROR_ID = "equipment-profile-equipment-error";
const CONFIRM_ID = "equipment-profile-confirm";

export const NAME_MAX = 40;
export const NAME_REQUIRED_MESSAGE = "Skriv et navn på profilen.";
export const NAME_LENGTH_MESSAGE = "Skriv et navn på høyst 40 tegn.";

type Errors = { name?: string; equipment?: string; form?: string };

function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return NAME_REQUIRED_MESSAGE;
  if (trimmed.length > NAME_MAX) return NAME_LENGTH_MESSAGE;
  return undefined;
}

/** Field errors from the API go under their field; anything else above the buttons. */
function errorsFrom(error: Error): Errors {
  const errors: Errors = {};
  if (error instanceof ApiError) {
    for (const item of error.fields) {
      if (item.field === "name") errors.name ??= item.message;
      else if (item.field === "equipment") errors.equipment ??= item.message;
    }
  }
  if (!errors.name && !errors.equipment) errors.form = error.message;
  return errors;
}

function ProfileForm({
  profile,
  onDone,
}: {
  profile: EquipmentProfile | null;
  onDone: () => void;
}) {
  const equipment = useEquipment();
  const create = useCreateEquipmentProfile();
  const update = useUpdateEquipmentProfile();
  const remove = useDeleteEquipmentProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set([BODYWEIGHT_SLUG, ...(profile?.equipment.map((e) => e.slug) ?? [])]),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const pending = create.isPending || update.isPending || remove.isPending;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function toggle(slug: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (on || slug === BODYWEIGHT_SLUG) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !equipment.data) return;
    const nameError = validateName(name);
    if (nameError) {
      setErrors({ name: nameError });
      nameRef.current?.focus();
      return;
    }
    setErrors({});
    // In seed order when the list is loaded, so the request reads like the form.
    const order = equipment.data?.map((item) => item.slug) ?? [];
    const slugs = [...checked].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const body = { name: name.trim(), equipment: slugs };
    const options = {
      onSuccess: onDone,
      onError: (error: Error) => {
        const next = errorsFrom(error);
        setErrors(next);
        if (next.name) nameRef.current?.focus();
      },
    };
    if (profile) update.mutate({ id: profile.id, body }, options);
    else create.mutate(body, options);
  }

  function startDelete() {
    setErrors({});
    setConfirming(true);
  }

  // Set when leaving the question (Avbryt or a failed delete): focus goes back to
  // "Slett profil" instead of dropping to the page.
  const refocusDelete = useRef(false);

  useEffect(() => {
    if (confirming) confirmCancelRef.current?.focus();
    else if (refocusDelete.current) {
      refocusDelete.current = false;
      deleteRef.current?.focus();
    }
  }, [confirming]);

  function leaveConfirm() {
    refocusDelete.current = true;
    setConfirming(false);
  }

  function confirmDelete() {
    if (!profile) return;
    remove.mutate(profile.id, {
      onSuccess: onDone,
      onError: (error) => {
        setErrors({ form: error.message });
        leaveConfirm();
      },
    });
  }

  if (confirming && profile) {
    return (
      <div className="flex flex-col gap-4">
        <p id={CONFIRM_ID} className="text-body font-medium text-foreground">
          Slette «{profile.name}»?
        </p>
        <div
          role="group"
          aria-labelledby={CONFIRM_ID}
          className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <button
            ref={confirmCancelRef}
            type="button"
            onClick={leaveConfirm}
            disabled={remove.isPending}
            className={SECONDARY_BUTTON_CLASS}
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={remove.isPending}
            className={DESTRUCTIVE_BUTTON_CLASS}
          >
            {remove.isPending ? "Sletter …" : "Ja, slett"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby={TITLE_ID}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={NAME_ID} className="text-small font-medium text-foreground">
          Navn
        </label>
        <input
          ref={nameRef}
          id={NAME_ID}
          type="text"
          autoComplete="off"
          maxLength={NAME_MAX}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
          }}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? NAME_ERROR_ID : undefined}
          className={INPUT_CLASS}
        />
        {errors.name && (
          <p id={NAME_ERROR_ID} className="text-small text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <fieldset
        className="flex flex-col gap-1"
        aria-describedby={errors.equipment ? EQUIPMENT_ERROR_ID : undefined}
      >
        <legend className="mb-2 text-small font-medium text-foreground">Utstyr</legend>
        {equipment.isError ? (
          <p role="alert" className="text-small text-destructive">
            {equipment.error.message}
          </p>
        ) : !equipment.data ? (
          <ul aria-hidden="true" className="flex flex-col gap-2" data-testid="equipment-skeleton">
            {[0, 1, 2].map((row) => (
              <li key={row} className="h-11 animate-pulse rounded-sm bg-muted" />
            ))}
          </ul>
        ) : (
          equipment.data.map((item) => {
            const locked = item.slug === BODYWEIGHT_SLUG;
            return (
              <label
                key={item.slug}
                className="flex min-h-11 items-center gap-3 rounded-sm px-1 text-body text-foreground"
              >
                <input
                  type="checkbox"
                  name="equipment"
                  value={item.slug}
                  checked={locked || checked.has(item.slug)}
                  disabled={locked}
                  onChange={(event) => toggle(item.slug, event.target.checked)}
                  className="size-5 accent-primary"
                />
                <span>{item.name}</span>
                {locked && (
                  <span className="text-small text-muted-foreground">Alltid med</span>
                )}
              </label>
            );
          })
        )}
        {errors.equipment && (
          <p id={EQUIPMENT_ERROR_ID} className="text-small text-destructive">
            {errors.equipment}
          </p>
        )}
      </fieldset>

      {errors.form && (
        <p role="alert" className="text-small text-destructive">
          {errors.form}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {profile && (
          <button
            ref={deleteRef}
            type="button"
            onClick={startDelete}
            disabled={pending}
            className={`${SECONDARY_DESTRUCTIVE_BUTTON_CLASS} sm:mr-auto`}
          >
            Slett profil
          </button>
        )}
        {/* Not before the equipment list is there: saving then would drop the ticks. */}
        <button
          type="submit"
          disabled={pending || !equipment.data}
          className={PRIMARY_BUTTON_CLASS}
        >
          {create.isPending || update.isPending ? "Lagrer …" : "Lagre"}
        </button>
      </div>
    </form>
  );
}

/**
 * The "Utstyr" sheet (story 4.2): a native `<dialog>` opened with `showModal()`, one level
 * deep; Esc closes and focus goes back to the opener. With `profile` it edits (rename,
 * tick equipment, "Slett profil" with a confirmation in the sheet); without, it creates.
 * Kroppsvekt is always ticked and cannot be unticked.
 */
export function EquipmentProfileSheet({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: EquipmentProfile | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The form's own focus ran before the dialog was open (child effects run first),
      // when the field could not take focus yet; move focus in now.
      document.getElementById(NAME_ID)?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)] max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
    >
      {open && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id={TITLE_ID} className="text-heading font-semibold text-foreground">
              {profile ? "Endre utstyrsprofil" : "Ny utstyrsprofil"}
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
          {/* A fresh form per profile, so fields never carry over between openings. */}
          <ProfileForm key={profile?.id ?? "new"} profile={profile} onDone={close} />
        </div>
      )}
    </dialog>
  );
}
