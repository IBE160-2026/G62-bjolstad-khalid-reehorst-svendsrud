import type { Metadata } from "next";
import { Suspense } from "react";

import { ExerciseDetail } from "@/modules/exercises/exercise-detail";

export const metadata: Metadata = { title: "Øvelse" };

// The shared AppShell reads usePathname(), which is unknown for a dynamic id while
// prerendering. Let this route render at request time instead of failing the build.
export const instant = false;

async function ExerciseRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExerciseDetail id={id} />;
}

export default function ExercisePage({ params }: PageProps<"/trening/ovelser/[id]">) {
  return (
    <Suspense>
      <ExerciseRoute params={params} />
    </Suspense>
  );
}
