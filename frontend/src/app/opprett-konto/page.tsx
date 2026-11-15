import type { Metadata } from "next";

import { RegisterForm } from "@/modules/identity/register-form";

export const metadata: Metadata = { title: "Opprett konto" };

export default function CreateAccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Lag en konto med e-post og passord. Da er det bare du som ser det du logger.
      </p>
      <RegisterForm />
    </div>
  );
}
