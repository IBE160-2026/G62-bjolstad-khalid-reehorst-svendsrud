"use client";

import type { EquipmentProfile } from "./api";

const NAME = "trening-profile";

/**
 * Segmented control of the user's Equipment Profiles ("Hjemme" · "Treningssenter" · …),
 * in their order. A native radio group: arrow keys move the choice; the selected
 * segment is plum.
 */
export function ProfileSwitch({
  profiles,
  selectedId,
  onChange,
}: {
  profiles: EquipmentProfile[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium text-foreground">Utstyr</legend>
      <div className="flex flex-wrap gap-2">
        {profiles.map((profile) => (
          // The whole segment is the label, so the tap target is at least 44 px high.
          <label
            key={profile.id}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-input bg-card px-4 text-body text-foreground has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={NAME}
              value={profile.id}
              checked={profile.id === selectedId}
              onChange={() => onChange(profile.id)}
              className="sr-only"
            />
            {profile.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
