import type { Metadata } from "next";

export const metadata: Metadata = { title: "Historikk" };

export default function HistoryPage() {
  return <p className="text-body text-foreground">Her ser du snart dagene du har logget.</p>;
}
