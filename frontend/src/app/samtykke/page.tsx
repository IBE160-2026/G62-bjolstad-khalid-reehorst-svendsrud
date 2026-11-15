import type { Metadata } from "next";

import { ConsentForm } from "@/modules/identity/consent-form";
import { LogoutButton } from "@/modules/identity/logout-button";

export const metadata: Metadata = { title: "Samtykke" };

export default function ConsentPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-foreground">
        Før du begynner, ber vi om lov til å lagre opplysninger om helsen din.
      </p>

      <section aria-labelledby="consent-what" className="flex flex-col gap-2">
        <h2 id="consent-what" className="text-heading font-medium text-foreground">
          Dette lagrer vi
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-6 text-body text-foreground">
          <li>Kroppsdata: vekt, høyde, alder, kjønn, aktivitetsnivå og mål.</li>
          <li>Maten du logger.</li>
          <li>Treningsøktene du logger.</li>
        </ul>
      </section>

      <section aria-labelledby="consent-why" className="flex flex-col gap-2">
        <h2 id="consent-why" className="text-heading font-medium text-foreground">
          Derfor lagrer vi det
        </h2>
        <p className="text-body text-foreground">
          Vi bruker opplysningene til å regne ut kalorimålet ditt og vise deg det du har logget.
          Bare du kan se dem. Du kan når som helst slette kontoen din under Profil.
        </p>
      </section>

      <ConsentForm />

      <div className="flex flex-col gap-2">
        <p className="text-body text-foreground">Vil du ikke fortsette nå? Da kan du logge ut.</p>
        <LogoutButton />
      </div>
    </div>
  );
}
