import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const deleteMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { DELETE: deleteMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import { ME_QUERY_KEY } from "./api";
import { DeleteAccount } from "./delete-account";

// jsdom has no modal dialog; mimic the parts the browser gives us (open state, close event).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

/** What the browser does on Esc: a cancelable `cancel`, then close unless prevented. */
function pressEscape(dialog: HTMLDialogElement) {
  act(() => {
    const cancel = new Event("cancel", { cancelable: true });
    if (dialog.dispatchEvent(cancel)) dialog.close();
  });
}

function renderDeleteAccount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(ME_QUERY_KEY, { id: "1", email: "ola@eksempel.no", consent_at: null });
  render(
    <QueryClientProvider client={client}>
      <DeleteAccount />
    </QueryClientProvider>,
  );
  const trigger = screen.getByRole("button", { name: "Slett konto" });
  return { client, trigger };
}

function openDialog(trigger: HTMLElement) {
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Slette kontoen?" }) as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
}

function confirmButton(dialog: HTMLDialogElement) {
  return Array.from(dialog.querySelectorAll("button")).find(
    (button) => button.textContent === "Slett konto",
  ) as HTMLButtonElement;
}

afterEach(() => {
  deleteMock.mockReset();
  replaceMock.mockReset();
});

describe("DeleteAccount", () => {
  it("opens a confirmation dialog that explains it cannot be undone", () => {
    const { trigger } = renderDeleteAccount();

    const dialog = openDialog(trigger);

    expect(dialog).toHaveAccessibleDescription(
      "Profilen, maten og treningsøktene dine slettes. Dette kan ikke angres.",
    );
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(confirmButton(dialog).className).toContain("bg-destructive");
    expect(confirmButton(dialog).className).toContain("text-destructive-foreground");
  });

  it("Avbryt closes the dialog, sends nothing and returns focus to the trigger", () => {
    const { trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(dialog.open).toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("Esc closes the dialog, sends nothing and returns focus to the trigger", () => {
    const { trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    pressEscape(dialog);

    expect(dialog.open).toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("confirming deletes the account, forgets the user and goes to the login page", async () => {
    deleteMock.mockResolvedValue({ data: undefined, error: undefined });
    const { client, trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(confirmButton(dialog));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn?konto=slettet"));
    expect(deleteMock).toHaveBeenCalledWith("/api/identity/me");
    expect(client.getQueryData(ME_QUERY_KEY)).toBeUndefined();
  });

  it("shows the error inside the dialog and keeps it open", async () => {
    deleteMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    const { client, trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(confirmButton(dialog));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Noe gikk galt. Prøv igjen om litt.");
    expect(dialog).toContainElement(alert);
    expect(dialog.open).toBe(true);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(client.getQueryData(ME_QUERY_KEY)).toBeDefined();
  });

  it("explains when the server cannot be reached", async () => {
    deleteMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(confirmButton(dialog));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    expect(dialog.open).toBe(true);
  });

  it("treats an already deleted account or gone session like success", async () => {
    deleteMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });
    const { client, trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(confirmButton(dialog));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn?konto=slettet"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(client.getQueryData(ME_QUERY_KEY)).toBeUndefined();
  });

  it("keeps the dialog open while deleting", async () => {
    let reject: (reason: unknown) => void = () => {};
    deleteMock.mockReturnValue(
      new Promise((_, rejectPromise) => {
        reject = rejectPromise;
      }),
    );
    const { trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(confirmButton(dialog));
    await waitFor(() => expect(screen.getByRole("button", { name: "Avbryt" })).toBeDisabled());

    pressEscape(dialog);
    expect(dialog.open).toBe(true);

    await act(async () => reject(new TypeError("Failed to fetch")));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Vi fikk ikke kontakt med serveren. Prøv igjen.");
    expect(dialog).toContainElement(alert);
    expect(dialog.open).toBe(true);
  });

  it("opens again without the old error", async () => {
    deleteMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { trigger } = renderDeleteAccount();
    const dialog = openDialog(trigger);
    fireEvent.click(confirmButton(dialog));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    openDialog(trigger);

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
