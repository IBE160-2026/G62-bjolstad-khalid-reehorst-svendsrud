"use client";

import { usePathname } from "next/navigation";

import { HelpButton } from "./help-button";
import { pageTitle } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-top-bar items-center justify-between gap-4 border-b border-border bg-background px-margin-mobile md:px-8">
      <h1 className="truncate text-heading font-medium text-foreground md:text-title md:font-light">
        {pageTitle(pathname)}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <HelpButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
