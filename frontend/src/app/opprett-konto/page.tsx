import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/modules/identity/register-form";
import { LOGIN_PATH } from "@/modules/identity/routes";
import { LINK_CLASS } from "@/modules/identity/styles";

export const metadata: Metadata = { title: "Opprett konto" };

export default function CreateAccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Lag en konto med e-post og passord. Da er det bare du som ser det du logger.
      </p>
      <RegisterForm />
      <p className="text-body text-foreground">
        Har du allerede en konto?{" "}
        <Link href={LOGIN_PATH} className={LINK_CLASS}>
          Logg inn
        </Link>
      </p>
    </div>
  );
}
