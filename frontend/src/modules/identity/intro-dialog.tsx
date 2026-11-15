"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useDismissIntro, useMe } from "./api";
import { PROFILE_SETUP_PATH, isConsentPath, isProfileSetupPath } from "./routes";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./styles";

const TITLE_ID = "intro-title";

const STEPS = [
  { title: "Sett opp profilen", text: "Du får ett tall: hvor mye du kan spise om dagen." },
  { title: "Logg maten", text: "Søk, skann strekkoden eller skriv inn selv." },
  { title: "Tren", text: "Start en økt og se hva du løftet sist." },
] as const;

/**
 * Users who closed the intro in this page session. A failed dismiss request must not
 * bring the dialog back when `/me` is refetched; it may show again after a new load.
 */
const dismissedThisSession = new Set<string>();

/** Test hook: forget the in-memory dismissals between tests. */
export function resetIntroSession() {
  dismissedThisSession.clear();
}

/** Show the intro to a consented user who has not closed it, on any page but `/samtykke`. */
export function shouldShowIntro(
  pathname: string,
  user: { id: string; consent_at: string | null; intro_dismissed_at?: string | null } | undefined,
): boolean {
  if (!user || user.consent_at === null || isConsentPath(pathname)) return false;
  return user.intro_dismissed_at === null && !dismissedThisSession.has(user.id);
}

/**
 * "Kom i gang" (story 2.3): a native `<dialog>` opened with `showModal()`, shown once after
 * consent. Either button or Esc stores the dismissal on the user in the backend.
 */
export function IntroDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const dismissal = useDismissIntro();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const user = me.data;
  const show = shouldShowIntro(pathname, user);

  // Why the dialog is closing; null means the browser closed it (Esc, close watcher).
  const closeReason = useRef<"button" | "navigate" | "hidden" | null>(null);
  // One dismissal per opening, whether it comes from a button or from `close`.
  const dismissSent = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (show && !dialog.open) {
      dismissSent.current = false;
      dialog.showModal();
      titleRef.current?.focus();
    } else if (!show && dialog.open) {
      // Not the user's choice (e.g. logged out): no dismissal, no focus move.
      closeReason.current = "hidden";
      dialog.close();
    }
  }, [show]);

  function dismiss() {
    if (dismissSent.current) return;
    dismissSent.current = true;
    if (user) dismissedThisSession.add(user.id);
    dismissal.mutate();
  }

  function skip() {
    dismiss();
    closeReason.current = "button";
    dialogRef.current?.close();
  }

  function setUpProfile() {
    dismiss();
    const navigate = !isProfileSetupPath(pathname);
    closeReason.current = navigate ? "navigate" : "button";
    dialogRef.current?.close();
    if (navigate) router.push(PROFILE_SETUP_PATH);
  }

  function handleClose() {
    const reason = closeReason.current;
    closeReason.current = null;
    if (reason === "hidden") return;
    // Esc may close the dialog without a `cancel` event (Chrome's close watcher).
    dismiss();
    // Back to the page, unless a new page is on its way: its main region is always focusable.
    if (reason !== "navigate") document.getElementById("innhold")?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={handleClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-6 text-foreground shadow-sheet backdrop:bg-[var(--scrim)]"
    >
      <div className="flex flex-col gap-5">
        <h2
          id={TITLE_ID}
          ref={titleRef}
          tabIndex={-1}
          className="text-heading font-semibold text-foreground outline-none"
        >
          Slik kommer du i gang
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-body font-medium text-foreground"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-body font-medium text-foreground">{step.title}</h3>
                <p className="text-small text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
          <button type="button" onClick={setUpProfile} className={PRIMARY_BUTTON_CLASS}>
            Sett opp profilen
          </button>
          <button type="button" onClick={skip} className={SECONDARY_BUTTON_CLASS}>
            Hopp over
          </button>
        </div>
      </div>
    </dialog>
  );
}
