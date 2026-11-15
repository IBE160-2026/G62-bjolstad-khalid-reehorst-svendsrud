import type { Metadata } from "next";

import { HealthStatus } from "./health-status";

// The root layout's title.template does not apply to a page in the same segment.
export const metadata: Metadata = { title: { absolute: "I dag · Prompt Force" } };

export default function TodayPage() {
  return (
    <>
      <p className="text-body text-foreground">
        Her ser du snart dagen din: mat, trening og hvor mye du har igjen.
      </p>
      <HealthStatus />
    </>
  );
}
