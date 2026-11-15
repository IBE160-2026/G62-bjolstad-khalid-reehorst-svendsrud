import type { Metadata } from "next";

export const metadata: Metadata = { title: "Samtykke" };

// Placeholder: story 1.5 adds the consent text, checkbox and "Godta og fortsett".
export default function ConsentPage() {
  return (
    <p className="text-body text-foreground">
      Kontoen din er klar. Her ber vi snart om samtykket ditt før du legger inn helsedata.
    </p>
  );
}
