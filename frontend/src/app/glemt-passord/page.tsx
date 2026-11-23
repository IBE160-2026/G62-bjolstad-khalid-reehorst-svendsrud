import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/modules/identity/forgot-password-form";
import { LOGIN_PATH } from "@/modules/identity/routes";
import { LINK_CLASS } from "@/modules/identity/styles";

export const metadata: Metadata = { title: "Glemt passord" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Skriv inn e-posten du logger inn med, så sender vi deg en lenke for å velge et nytt
        passord.
      </p>
      <ForgotPasswordForm />
      <p className="text-body text-foreground">
        Husker du passordet?{" "}
        <Link href={LOGIN_PATH} className={LINK_CLASS}>
          Logg inn
        </Link>
      </p>
    </div>
  );
}
