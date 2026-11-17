import type { Metadata } from "next";
import { Suspense } from "react";

import { FoodDay } from "@/modules/food/food-day";

export const metadata: Metadata = { title: "Mat" };

export default function FoodPage() {
  return (
    // Reads `?dato=`, so it renders on the client.
    <Suspense fallback={null}>
      <FoodDay />
    </Suspense>
  );
}
