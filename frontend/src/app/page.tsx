import type { Metadata } from "next";
import { Suspense } from "react";

import { TodayPage } from "@/modules/overview/today-page";

// The root layout's title.template does not apply to a page in the same segment.
export const metadata: Metadata = { title: { absolute: "I dag · Prompt Force" } };

export default function TodayRoute() {
  return (
    // Reads `?dato=`, so it renders on the client.
    <Suspense fallback={null}>
      <TodayPage />
    </Suspense>
  );
}
