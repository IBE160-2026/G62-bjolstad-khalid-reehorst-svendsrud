import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const CARD_CLASS =
  "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card";

/** The whole header row of a section card is a link to its page (EXPERIENCE.md). */
export function CardHeader({ id, href, title }: { id: string; href: string; title: string }) {
  return (
    <h2 id={id} className="text-heading font-medium text-foreground">
      <Link
        href={href}
        className="-mx-2 flex min-h-11 items-center justify-between rounded-sm px-2 hover:bg-muted"
      >
        {title}
        <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
      </Link>
    </h2>
  );
}
