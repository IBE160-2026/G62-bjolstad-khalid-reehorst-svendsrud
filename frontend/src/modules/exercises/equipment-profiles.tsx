"use client";

import { useRef, useState } from "react";

import { SECONDARY_BUTTON_CLASS } from "@/modules/identity/styles";

import { MAX_EQUIPMENT_PROFILES, useEquipmentProfiles, type EquipmentProfile } from "./api";
import { EquipmentProfileSheet } from "./equipment-profile-sheet";

/** Equipment names as one line, e.g. "Kroppsvekt, Manualer". */
export const LIMIT_MESSAGE = "Du kan ha opptil 10 utstyrsprofiler.";
const LIMIT_ID = "equipment-profile-limit";

export function equipmentText(profile: EquipmentProfile): string {
  return profile.equipment.map((item) => item.name).join(", ");
}

/**
 * "Utstyr" on Profil (story 4.2): the user's Equipment Profiles with "Endre", and
 * "Ny utstyrsprofil". Both open the same sheet.
 */
export function EquipmentProfiles() {
  const profiles = useEquipmentProfiles();
  // undefined: closed; null: new profile; otherwise the profile being edited.
  const [editing, setEditing] = useState<EquipmentProfile | null | undefined>(undefined);
  const openerRef = useRef<HTMLElement | null>(null);

  function openSheet(profile: EquipmentProfile | null, opener: HTMLElement) {
    openerRef.current = opener;
    setEditing(profile);
  }

  function closeSheet() {
    setEditing(undefined);
    const opener = openerRef.current;
    // The opener may be gone (its profile was deleted); then the new-profile button.
    if (opener?.isConnected) opener.focus();
    else document.getElementById("new-equipment-profile")?.focus();
  }

  const atLimit = (profiles.data?.length ?? 0) >= MAX_EQUIPMENT_PROFILES;

  let content;
  if (profiles.data) {
    content = (
      <ul className="flex flex-col divide-y divide-border rounded-lg border-[1.5px] border-border bg-card">
        {profiles.data.map((profile) => (
          <li key={profile.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-body font-medium text-foreground">{profile.name}</span>
              <span className="text-small text-muted-foreground">{equipmentText(profile)}</span>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Endre ${profile.name}`}
              onClick={(event) => openSheet(profile, event.currentTarget)}
              className="min-h-11 shrink-0 rounded-full px-4 text-small font-medium text-accent-foreground underline underline-offset-4 hover:bg-muted"
            >
              Endre
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (profiles.isError) {
    content = (
      <p role="alert" className="text-body text-destructive">
        {profiles.error.message}
      </p>
    );
  } else {
    content = (
      <ul aria-hidden="true" className="flex flex-col gap-2" data-testid="profiles-skeleton">
        {[0, 1].map((row) => (
          <li key={row} className="h-16 animate-pulse rounded-sm bg-muted" />
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="equipment-heading" className="flex flex-col gap-4">
      <h2 id="equipment-heading" className="text-heading font-medium text-foreground">
        Utstyr
      </h2>
      <p className="text-small text-muted-foreground">
        Lagre utstyret du har der du trener, så foreslår vi øvelser du kan gjøre.
      </p>
      {content}
      <div className="flex flex-col items-start gap-2">
        <button
          id="new-equipment-profile"
          type="button"
          aria-haspopup="dialog"
          disabled={atLimit}
          aria-describedby={atLimit ? LIMIT_ID : undefined}
          onClick={(event) => openSheet(null, event.currentTarget)}
          className={SECONDARY_BUTTON_CLASS}
        >
          Ny utstyrsprofil
        </button>
        {atLimit && (
          <p id={LIMIT_ID} className="text-small text-muted-foreground">
            {LIMIT_MESSAGE}
          </p>
        )}
      </div>
      <EquipmentProfileSheet
        open={editing !== undefined}
        profile={editing ?? null}
        onClose={closeSheet}
      />
    </section>
  );
}
