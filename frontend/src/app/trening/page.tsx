import type { Metadata } from "next";

import { Suggestions } from "@/modules/exercises/suggestions";

export const metadata: Metadata = { title: "Trening" };

export default function TrainingPage() {
  return <Suggestions />;
}
