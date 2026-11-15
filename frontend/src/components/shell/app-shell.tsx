"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isAuthPath } from "@/modules/identity/routes";
import { SessionGuard } from "@/modules/identity/session-guard";

import { APP_NAME, pageTitle } from "./nav-items";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { ThemeToggle } from "./theme-toggle";
import { TopBar } from "./top-bar";

const SKIP_LINK_CLASS =
  "sr-only z-30 rounded-full bg-card px-4 py-3 text-body font-medium text-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2";

/** Navigation chrome around every page. DOM order = reading/tab order. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAuthPath(pathname)) return <AuthLayout title={pageTitle(pathname)}>{children}</AuthLayout>;

  return (
    <div className="flex min-h-dvh">
      <SessionGuard />
      <a href="#innhold" className={SKIP_LINK_CLASS}>
        Hopp til innhold
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="innhold"
          tabIndex={-1}
          className="flex w-full max-w-content flex-1 flex-col gap-4 px-margin-mobile pt-6 pb-[calc(var(--tab-bar-height)+2.5rem)] md:px-8 md:pb-10"
        >
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}

/** Logged-out pages: brand, theme toggle and the form; no navigation. */
function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#innhold" className={SKIP_LINK_CLASS}>
        Hopp til innhold
      </a>
      <header className="flex h-top-bar items-center justify-between gap-4 px-margin-mobile md:px-8">
        <span className="text-heading font-medium text-foreground">{APP_NAME}</span>
        <ThemeToggle />
      </header>
      <main
        id="innhold"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-margin-mobile pt-6 pb-10"
      >
        <h1 className="text-title font-light text-foreground">{title}</h1>
        {children}
      </main>
    </div>
  );
}
