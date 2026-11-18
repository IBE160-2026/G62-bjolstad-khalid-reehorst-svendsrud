"use client";

import { usePathname } from "next/navigation";

import { NavLink } from "./nav-link";
import { TAB_BAR_ITEMS, isActive } from "./nav-items";

/** Bottom tab bar below 768 px: I dag, Mat, Trening, Profil. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hovedmeny"
      className="fixed inset-x-0 bottom-0 z-20 h-tab-bar border-t border-border bg-card md:hidden"
    >
      <ul className="grid h-full grid-cols-4 gap-1 px-2">
        {TAB_BAR_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex items-center justify-center">
              <NavLink
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 w-full max-w-24 flex-col items-center justify-center gap-1 rounded-full px-2 text-label font-medium transition-colors ${
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
