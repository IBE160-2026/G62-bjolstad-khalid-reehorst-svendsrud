"use client";

import { usePathname } from "next/navigation";

import { NavLink } from "./nav-link";
import { APP_NAME, NAV_ITEMS, isActive } from "./nav-items";

/** Sidebar with labels at >= 1024 px, icon rail at 768–1023 px, hidden below. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hovedmeny"
      className="sticky top-0 hidden h-dvh w-rail shrink-0 flex-col border-r border-border bg-card md:flex lg:w-sidebar"
    >
      <div className="flex h-top-bar items-center justify-center px-3 lg:justify-start lg:px-6">
        <span aria-hidden="true" className="text-heading font-medium text-foreground lg:hidden">
          PF
        </span>
        <span className="sr-only text-heading font-medium text-foreground lg:not-sr-only">
          {APP_NAME}
        </span>
      </div>
      <ul className="flex flex-col gap-1 px-3 pt-2 lg:px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <NavLink
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center gap-3 rounded-full px-3 text-body font-medium transition-colors lg:justify-start lg:px-4 ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={2} />
                <span className="sr-only lg:not-sr-only">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
