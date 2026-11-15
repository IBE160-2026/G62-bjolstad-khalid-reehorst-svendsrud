"use client";

import { useMe } from "@/modules/identity/api";

import { isProfileMissing, useProfile } from "./api";
import { ProfileForm } from "./profile-form";
import { TargetResult } from "./target-result";

/** Profiloppsett: the form until a profile exists, then the stored target. */
export function ProfileSetup() {
  const me = useMe();
  // The profile endpoints require consent; before it, SessionGuard sends the user away.
  const profile = useProfile({ enabled: typeof me.data?.consent_at === "string" });

  if (profile.data) return <TargetResult profile={profile.data} />;

  if (isProfileMissing(profile.error)) {
    return (
      <>
        <p className="text-body text-foreground">
          Fortell litt om deg selv, så regner vi ut hvor mye du kan spise om dagen.
        </p>
        <ProfileForm />
      </>
    );
  }

  if (profile.error) {
    return (
      <p role="alert" className="text-body text-destructive">
        {profile.error.message}
      </p>
    );
  }

  return <p className="text-body text-muted-foreground">Henter profilen …</p>;
}
