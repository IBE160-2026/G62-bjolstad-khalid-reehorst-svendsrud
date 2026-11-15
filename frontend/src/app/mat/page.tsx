import type { Metadata } from "next";

import { FoodDay } from "@/modules/food/food-day";

export const metadata: Metadata = { title: "Mat" };

export default function FoodPage() {
  return <FoodDay />;
}
