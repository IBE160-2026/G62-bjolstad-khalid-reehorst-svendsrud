import type { Metadata } from "next";

import { EquipmentProfiles } from "@/modules/exercises/equipment-profiles";
import { DeactivateAccount } from "@/modules/identity/deactivate-account";
import { DeleteAccount } from "@/modules/identity/delete-account";
import { LogoutButton } from "@/modules/identity/logout-button";
import { ProfileEditor } from "@/modules/profile/profile-editor";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-10">
      <ProfileEditor />
      <EquipmentProfiles />
      <section aria-labelledby="account-heading" className="flex flex-col gap-4">
        <h2 id="account-heading" className="text-heading font-medium text-foreground">
          Konto
        </h2>
        <LogoutButton />
        <DeactivateAccount />
        <DeleteAccount />
      </section>
    </div>
  );
}
