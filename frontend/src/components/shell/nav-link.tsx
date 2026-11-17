"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";

import { DATED_PATHS, DATE_PARAM, parseDateParam, useOsloToday } from "@/lib/selected-date";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** A link to Mat or Trening keeps the chosen `?dato=` when it is a real, non-future date
 * (story 6.3). */
function DatedNavLink({ href, ...props }: Props) {
  const today = useOsloToday();
  const raw = useSearchParams().get(DATE_PARAM);
  const dato = today === null ? null : parseDateParam(raw, today);
  const target = dato && dato !== today ? `${href}?${DATE_PARAM}=${dato}` : href;
  return <Link href={target} {...props} />;
}

/** A navigation link; links to Mat and Trening keep a valid `?dato=` from the address. */
export function NavLink({ href, ...props }: Props) {
  if (!DATED_PATHS.includes(href)) return <Link href={href} {...props} />;
  return (
    // useSearchParams needs a Suspense boundary; until then the plain link is shown.
    <Suspense fallback={<Link href={href} {...props} />}>
      <DatedNavLink href={href} {...props} />
    </Suspense>
  );
}
