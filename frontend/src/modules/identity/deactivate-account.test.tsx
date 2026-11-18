import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { POST: postMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import {
  expectOpenerSheetFocusCycle,
  installDialogPolyfill,
  pressEscape,
} from "@/test/sheet-a11y";

import { ME_QUERY_KEY } from "./api";
import { DeactivateAccount } from "./deactivate-account";

beforeAll(installDialogPolyfill);

function renderDeactivateAccount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(ME_QUERY_KEY, { id: "1", email: "ola@eksempel.no", consent_at: null });
  render(
    <QueryClientProvider client={client}>
      <DeactivateAccount />
    </QueryClientProvider>,
  );
  const trigger = screen.getByRole("button", { name: "Deaktiver konto" });
  return { client, trigger };
}

function openDialog(trigger: HTMLElement) {
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Deaktivere kontoen?" });
  expect(dialog).toHaveAttribute("open");
  return dialog;
}

function confirm() {
  fireEvent.click(screen.getByRole("button", { name: "Deaktiver" }));
}

afterEach(() => {
  postMock.mockReset();
  replaceMock.mockReset();
});

describe("DeactivateAccount", () => {
  it("opens a dialog that says nothing is deleted, with focus on Avbryt", () => {
    const { trigger } = renderDeactivateAccount();

    const dialog = openDialog(trigger);

    expect(dialog).toHaveAccessibleDescription(
      "Du logges ut, og ingen data slettes. Logg inn igjen når du vil fortsette.",
    );
    expect(screen.getByRole("button", { name: "Avbryt" })).toHaveFocus();
  });

  it("Avbryt closes the dialog, sends nothing and returns focus to the trigger", () => {
    const { trigger } = renderDeactivateAccount();
    const dialog = openDialog(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(postMock).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("Esc closes the dialog and sends nothing", () => {
    const { trigger } = renderDeactivateAccount();
    const dialog = openDialog(trigger);

    pressEscape(dialog);

    expect(dialog).not.toHaveAttribute("open");
    expect(postMock).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("confirming deactivates, forgets the user and goes to the login page", async () => {
    postMock.mockResolvedValue({ data: undefined, error: undefined });
    const { client, trigger } = renderDeactivateAccount();
    openDialog(trigger);

    confirm();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/logg-inn"));
    expect(postMock).toHaveBeenCalledWith("/api/identity/deactivate");
    expect(client.getQueryData(ME_QUERY_KEY)).toBeUndefined();
  });

  it("a gone session is not success: it explains and stays", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "unauthorized", message: "Du må logge inn." } },
    });
    const { trigger } = renderDeactivateAccount();
    const dialog = openDialog(trigger);

    confirm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Du må logge inn på nytt for å deaktivere kontoen.");
    expect(dialog).toContainElement(alert);
    expect(dialog).toHaveAttribute("open");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows the error inside the dialog and keeps it open", async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: { error: { code: "internal_error", message: "Noe gikk galt. Prøv igjen om litt." } },
    });
    const { client, trigger } = renderDeactivateAccount();
    const dialog = openDialog(trigger);

    confirm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Noe gikk galt. Prøv igjen om litt.");
    expect(dialog).toContainElement(alert);
    await waitFor(() => expect(alert).toHaveFocus());
    expect(dialog).toHaveAttribute("open");
    expect(replaceMock).not.toHaveBeenCalled();
    expect(client.getQueryData(ME_QUERY_KEY)).toBeDefined();
  });

  it("shows Deaktiverer … and keeps the dialog open while pending", async () => {
    let reject: (reason: unknown) => void = () => {};
    postMock.mockReturnValue(
      new Promise((_, rejectPromise) => {
        reject = rejectPromise;
      }),
    );
    const { trigger } = renderDeactivateAccount();
    const dialog = openDialog(trigger);

    confirm();
    await waitFor(() => expect(screen.getByRole("button", { name: "Avbryt" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Deaktiverer …" })).toBeDisabled();
    expect(dialog).toHaveAttribute("aria-busy", "true");
    const pending = screen
      .getAllByRole("status")
      .find((element) => element.textContent === "Deaktiverer …");
    expect(pending).toHaveAttribute("aria-live", "polite");

    pressEscape(dialog);
    expect(dialog).toHaveAttribute("open");

    await act(async () => reject(new TypeError("Failed to fetch")));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vi fikk ikke kontakt med serveren. Prøv igjen.",
    );
    expect(dialog).toHaveAttribute("open");
    expect(dialog).not.toHaveAttribute("aria-busy");
  });
});

describe("sheet accessibility (story 6.4)", () => {
  it("Deaktiver konto: focus moves in, Esc closes, focus back on the opener", async () => {
    const { trigger } = renderDeactivateAccount();

    await expectOpenerSheetFocusCycle(trigger, () =>
      screen.getByRole("dialog", { name: "Deaktivere kontoen?" }),
    );
  });
});
