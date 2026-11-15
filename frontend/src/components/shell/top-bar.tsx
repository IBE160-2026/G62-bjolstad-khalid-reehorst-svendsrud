"use client";

import { usePathname } from "next/navigation";

import { pageTitle } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-top-bar items-center justify-between gap-4 border-b border-border bg-background px-margin-mobile md:px-8">
      <h1 className="truncate text-heading font-semibold text-foreground md:text-title">
        {pageTitle(pathname)}
      </h1>
      <ThemeToggle />
    </header>
  );
}
