import type { Metadata } from "next";

import { ProfileSetup } from "@/modules/profile/profile-setup";

export const metadata: Metadata = { title: "Profiloppsett" };

export default function ProfileSetupPage() {
  return <ProfileSetup />;
}
