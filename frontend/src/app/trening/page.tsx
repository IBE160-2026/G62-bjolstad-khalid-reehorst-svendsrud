import type { Metadata } from "next";
import { Suspense } from "react";

import { Suggestions } from "@/modules/exercises/suggestions";

export const metadata: Metadata = { title: "Trening" };

export default function TrainingPage() {
  return (
    // Reads `?dato=`, so it renders on the client.
    <Suspense fallback={null}>
      <Suggestions />
    </Suspense>
  );
}
