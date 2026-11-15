import type { Metadata } from "next";

import { LogoutButton } from "@/modules/identity/logout-button";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">Her legger du snart inn profilen og målet ditt.</p>
      <LogoutButton />
    </div>
  );
}
