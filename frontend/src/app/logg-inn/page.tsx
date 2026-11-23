import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountDeletedStatus } from "@/modules/identity/account-deleted-status";
import { LoginForm } from "@/modules/identity/login-form";
import { PasswordChangedStatus } from "@/modules/identity/password-changed-status";
import { FORGOT_PASSWORD_PATH, REGISTER_PATH } from "@/modules/identity/routes";
import { LINK_CLASS } from "@/modules/identity/styles";

export const metadata: Metadata = { title: "Logg inn" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Reads the query string, so it renders on the client; the rest stays static. */}
      <Suspense fallback={null}>
        <AccountDeletedStatus />
        <PasswordChangedStatus />
      </Suspense>
      <p className="text-body text-foreground">Velkommen tilbake. Logg inn med e-post og passord.</p>
      <LoginForm />
      <p className="text-body text-foreground">
        <Link href={FORGOT_PASSWORD_PATH} className={LINK_CLASS}>
          Glemt passord?
        </Link>
      </p>
      <p className="text-body text-foreground">
        Ny her?{" "}
        <Link href={REGISTER_PATH} className={LINK_CLASS}>
          Opprett konto
        </Link>
      </p>
    </div>
  );
}
