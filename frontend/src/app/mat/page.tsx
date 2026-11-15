import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mat" };

export default function FoodPage() {
  return <p className="text-body text-foreground">Her logger du snart det du spiser.</p>;
}
