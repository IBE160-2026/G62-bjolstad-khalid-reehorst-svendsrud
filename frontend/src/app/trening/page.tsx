import type { Metadata } from "next";

import { ExerciseList } from "@/modules/exercises/exercise-list";

export const metadata: Metadata = { title: "Trening" };

export default function TrainingPage() {
  return <ExerciseList />;
}
