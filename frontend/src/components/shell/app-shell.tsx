import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { TopBar } from "./top-bar";

/** Navigation chrome around every page. DOM order = reading/tab order. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#innhold"
        className="sr-only z-30 rounded-full bg-card px-4 py-3 text-body font-semibold text-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
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
