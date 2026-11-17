import type { Metadata } from "next";

import { WorkoutPage } from "@/modules/workouts/workout-page";

export const metadata: Metadata = { title: "Økt" };

export default function WorkoutRoute() {
  return <WorkoutPage />;
}
