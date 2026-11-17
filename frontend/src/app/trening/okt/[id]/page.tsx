import type { Metadata } from "next";
import { Suspense } from "react";

import { WorkoutByIdPage } from "@/modules/workouts/workout-page";

export const metadata: Metadata = { title: "Økt" };

// The shared AppShell reads usePathname(), which is unknown for a dynamic id while
// prerendering. Let this route render at request time instead of failing the build.
export const instant = false;

async function WorkoutRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutByIdPage id={id} />;
}

export default function WorkoutByIdRoute({ params }: PageProps<"/trening/okt/[id]">) {
  return (
    <Suspense>
      <WorkoutRoute params={params} />
    </Suspense>
  );
}
