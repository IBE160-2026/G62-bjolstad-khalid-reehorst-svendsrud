import type { Metadata } from "next";
import { Suspense } from "react";

import { NewPasswordForm } from "@/modules/identity/new-password-form";

export const metadata: Metadata = { title: "Nytt passord" };

export default function NewPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Velg et nytt passord. Etterpå logger du inn med det.
      </p>
      {/* Reads the token from the query string, so it renders on the client. */}
      <Suspense fallback={null}>
        <NewPasswordForm />
      </Suspense>
    </div>
  );
}
