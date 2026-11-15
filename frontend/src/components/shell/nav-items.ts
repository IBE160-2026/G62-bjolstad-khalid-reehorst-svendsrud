import { CalendarDays, Dumbbell, House, Soup, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom tab bar (< 768 px). */
  inTabBar: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "I dag", icon: House, inTabBar: true },
  { href: "/mat", label: "Mat", icon: Soup, inTabBar: true },
  { href: "/trening", label: "Trening", icon: Dumbbell, inTabBar: true },
  { href: "/historikk", label: "Historikk", icon: CalendarDays, inTabBar: false },
  { href: "/profil", label: "Profil", icon: UserRound, inTabBar: true },
];

export const TAB_BAR_ITEMS = NAV_ITEMS.filter((item) => item.inTabBar);

export const APP_NAME = "Prompt Force";

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title shown in the top bar for the current route. */
export function pageTitle(pathname: string): string {
  return NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label ?? APP_NAME;
}
