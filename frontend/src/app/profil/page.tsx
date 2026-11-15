import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return <p className="text-body text-foreground">Her legger du snart inn profilen og målet ditt.</p>;
}
