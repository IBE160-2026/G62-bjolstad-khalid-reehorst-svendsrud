"use client";

import { useState } from "react";

import { useMe } from "@/modules/identity/api";

import { isProfileMissing, useProfile } from "./api";
import { ProfileForm } from "./profile-form";
import { TargetResult } from "./target-result";

/** Profil page (story 2.2): the current target and the saved profile, editable in place. */
export function ProfileEditor() {
  const me = useMe();
  // The profile endpoints require consent; before it, SessionGuard sends the user away.
  const profile = useProfile({ enabled: typeof me.data?.consent_at === "string" });
  const [saved, setSaved] = useState(false);

  // Data first: a failed background refetch must not hide the loaded profile or the form.
  if (!profile.data) {
    // No profile yet: SessionGuard sends the user to Profiloppsett.
    if (profile.error && !isProfileMissing(profile.error)) {
      return (
        <p role="alert" className="text-body text-destructive">
          {profile.error.message}
        </p>
      );
    }
    return <p className="text-body text-muted-foreground">Henter profilen …</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <TargetResult profile={profile.data} standalone={false} />
      <p role="status" className="text-body text-foreground">
        {saved ? "Lagret. Dagens mål er oppdatert." : ""}
      </p>
      <section aria-labelledby="profile-edit-heading" className="flex flex-col gap-4">
        <h2 id="profile-edit-heading" className="text-heading font-medium text-foreground">
          Endre profilen
        </h2>
        <ProfileForm
          initial={profile.data}
          submitLabel="Lagre endringene"
          pendingLabel="Lagrer …"
          onSaved={() => setSaved(true)}
          onEdit={() => setSaved(false)}
        />
      </section>
    </div>
  );
}
