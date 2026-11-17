/**
 * Shared accessibility checks for sheets, dialogs and toasts (story 6.4, UX-DR16/17).
 * Every native `<dialog>` in the app must: take focus when it opens, close on Esc and
 * give focus back to whatever opened it. Undo toasts must sit in a polite live region.
 */
import { act, fireEvent, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * jsdom has no modal dialog; mimic what the browser gives us (open state, close event).
 * Call it in `beforeAll`.
 */
export function installDialogPolyfill() {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

/** Esc as the browser does it: a cancelable `cancel`, then `close` unless prevented. */
export function pressEscape(dialog: HTMLElement) {
  act(() => {
    const cancel = new Event("cancel", { cancelable: true });
    if (dialog.dispatchEvent(cancel)) (dialog as HTMLDialogElement).close();
  });
}

type SheetCheck = {
  /** Opens the sheet, e.g. by clicking its button. */
  open: () => void | Promise<void>;
  /** The open sheet. */
  dialog: () => HTMLElement | Promise<HTMLElement>;
  /** Where focus must land after Esc: the opener, or the page for a sheet without one. */
  returnsTo: () => HTMLElement | null;
};

/** Focus moves into the sheet on open; Esc closes it; focus goes back to `returnsTo`. */
export async function expectSheetFocusCycle({ open, dialog, returnsTo }: SheetCheck) {
  await act(async () => {
    await open();
  });
  const sheet = await dialog();
  expect(sheet).toHaveAttribute("open");
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));

  pressEscape(sheet);
  await waitFor(() => expect(sheet).not.toHaveAttribute("open"));
  await waitFor(() => expect(returnsTo()).toHaveFocus());
}

/** The usual case: a button opens the sheet and gets focus back. */
export function expectOpenerSheetFocusCycle(
  opener: HTMLElement,
  dialog: () => HTMLElement | Promise<HTMLElement>,
) {
  return expectSheetFocusCycle({
    open: () => {
      // A click focuses the button in a browser; jsdom does not.
      opener.focus();
      fireEvent.click(opener);
    },
    dialog,
    returnsTo: () => opener,
  });
}

/**
 * Like `expectOpenerSheetFocusCycle`, but the opener is clicked without being focused
 * first (as with a mouse in Safari, or jsdom): the sheet itself must put focus back.
 */
export function expectOpenerSheetFocusCycleWithoutFocus(
  opener: HTMLElement,
  dialog: () => HTMLElement | Promise<HTMLElement>,
) {
  return expectSheetFocusCycle({
    open: () => {
      fireEvent.click(opener);
    },
    dialog,
    returnsTo: () => opener,
  });
}

/** The element is announced: it sits inside an `aria-live="polite"` region. */
export function expectInPoliteLiveRegion(element: HTMLElement) {
  expect(element.closest('[aria-live="polite"]')).not.toBeNull();
}
