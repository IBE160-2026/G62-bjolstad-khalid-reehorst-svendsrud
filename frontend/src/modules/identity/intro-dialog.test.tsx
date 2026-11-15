import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/profiloppsett" }));
const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock, POST: postMock } }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

import { ME_QUERY_KEY } from "./api";
import { IntroDialog, resetIntroSession } from "./intro-dialog";

const CONSENTED = "2026-11-15T10:00:00Z";
const DISMISSED = "2026-11-15T10:05:00Z";

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

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  pushMock.mockReset();
  resetIntroSession();
});

type User = {
  id: string;
  email: string;
  consent_at: string | null;
  intro_dismissed_at: string | null;
};

function user(overrides: Partial<User> = {}): User {
  return {
    id: "1",
    email: "ola@eksempel.no",
    consent_at: CONSENTED,
    intro_dismissed_at: null,
    ...overrides,
  };
}

function renderIntro(pathname: string, me: User | null) {
  navigation.pathname = pathname;
  getMock.mockResolvedValue(
    me
      ? { data: me, error: undefined }
      : {
          data: undefined,
          error: { error: { code: "unauthorized", message: "Du må logge inn." } },
        },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (me) client.setQueryData(ME_QUERY_KEY, me);
  render(
    <QueryClientProvider client={client}>
      <main id="innhold" tabIndex={-1}>
        <h1>Side</h1>
      </main>
      <IntroDialog />
    </QueryClientProvider>,
  );
  return client;
}

/** The dialog element, open or closed (a closed `<dialog>` has no accessible role). */
function findDialog() {
  const dialog = document.querySelector<HTMLDialogElement>("dialog");
  expect(dialog).not.toBeNull();
  const titleId = dialog?.getAttribute("aria-labelledby") ?? "";
  expect(document.getElementById(titleId)).toHaveTextContent("Slik kommer du i gang");
  return dialog as HTMLDialogElement;
}

/** What the browser does on Esc: a cancelable `cancel`, then close unless prevented. */
function pressEscape(dialog: HTMLDialogElement) {
  act(() => {
    const cancel = new Event("cancel", { cancelable: true });
    if (dialog.dispatchEvent(cancel)) dialog.close();
  });
}

describe("IntroDialog", () => {
  it("opens for a consented user who has not dismissed it, with focus inside", async () => {
    renderIntro("/profiloppsett", user());

    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveTextContent("Slik kommer du i gang");
    const steps = dialog.querySelectorAll("ol > li");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Sett opp profilen");
    expect(steps[0]).toHaveTextContent("Du får ett tall: hvor mye du kan spise om dagen.");
    expect(steps[1]).toHaveTextContent("Logg maten");
    expect(steps[1]).toHaveTextContent("Søk, skann strekkoden eller skriv inn selv.");
    expect(steps[2]).toHaveTextContent("Tren");
    expect(steps[2]).toHaveTextContent("Start en økt og se hva du løftet sist.");
    expect(screen.getByRole("button", { name: "Sett opp profilen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hopp over" })).toBeInTheDocument();
  });

  it("opens on app pages too", async () => {
    renderIntro("/", user());

    await waitFor(() => expect(findDialog().open).toBe(true));
  });

  it.each([
    ["on /samtykke", "/samtykke", user({ consent_at: null })],
    ["on /samtykke after consent", "/samtykke", user()],
    ["without consent", "/", user({ consent_at: null })],
    ["once dismissed", "/profiloppsett", user({ intro_dismissed_at: DISMISSED })],
    ["when logged out", "/", null],
  ])("stays closed %s", async (_name, pathname, me) => {
    const client = renderIntro(pathname, me);

    await waitFor(() => expect(client.getQueryState(ME_QUERY_KEY)?.fetchStatus).toBe("idle"));
    expect(getMock).toHaveBeenCalled();
    expect(findDialog().open).toBe(false);
  });

  it("'Sett opp profilen' dismisses, closes and goes to profile setup", async () => {
    postMock.mockResolvedValue({ data: user({ intro_dismissed_at: DISMISSED }), error: undefined });
    const client = renderIntro("/", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Sett opp profilen" }));

    expect(dialog.open).toBe(false);
    expect(pushMock).toHaveBeenCalledWith("/profiloppsett");
    expect(document.activeElement).not.toBe(document.getElementById("innhold"));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/identity/intro/dismiss"));
    expect(postMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(client.getQueryData<User>(ME_QUERY_KEY)?.intro_dismissed_at).toBe(DISMISSED),
    );
  });

  it("'Sett opp profilen' does not navigate when already on profile setup", async () => {
    postMock.mockResolvedValue({ data: user({ intro_dismissed_at: DISMISSED }), error: undefined });
    renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Sett opp profilen" }));

    expect(dialog.open).toBe(false);
    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/identity/intro/dismiss"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("'Hopp over' dismisses at once, closes and returns focus to the page", async () => {
    let answer: (value: { data: User; error: undefined }) => void = () => {};
    postMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const client = renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Hopp over" }));

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(document.getElementById("innhold"));
    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    // Optimistic: the cache says dismissed while the server has not answered yet.
    const optimistic = client.getQueryData<User>(ME_QUERY_KEY)?.intro_dismissed_at;
    expect(optimistic).not.toBeNull();
    expect(optimistic).not.toBe(DISMISSED);

    await act(async () =>
      answer({ data: user({ intro_dismissed_at: DISMISSED }), error: undefined }),
    );

    await waitFor(() =>
      expect(client.getQueryData<User>(ME_QUERY_KEY)?.intro_dismissed_at).toBe(DISMISSED),
    );
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it("Esc dismisses, closes and returns focus to the page", async () => {
    postMock.mockResolvedValue({ data: user({ intro_dismissed_at: DISMISSED }), error: undefined });
    renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    pressEscape(dialog);

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(document.getElementById("innhold"));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/identity/intro/dismiss"));
  });

  it("dismisses when the browser closes it on Esc without a cancel event", async () => {
    postMock.mockResolvedValue({ data: user({ intro_dismissed_at: DISMISSED }), error: undefined });
    renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    act(() => dialog.close());

    expect(document.activeElement).toBe(document.getElementById("innhold"));
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
  });

  it("closes without dismissing or moving focus when the user is gone", async () => {
    const client = renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));
    const focused = document.activeElement;

    act(() => client.setQueryData(ME_QUERY_KEY, user({ consent_at: null })));

    await waitFor(() => expect(dialog.open).toBe(false));
    expect(document.activeElement).toBe(focused);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("stays closed in this session when the dismiss request fails", async () => {
    postMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const client = renderIntro("/profiloppsett", user());
    const dialog = findDialog();
    await waitFor(() => expect(dialog.open).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Hopp over" }));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    // The server still says "not dismissed" on the next /me.
    await act(() => client.refetchQueries({ queryKey: ME_QUERY_KEY }));

    expect(client.getQueryData<User>(ME_QUERY_KEY)?.intro_dismissed_at).toBeNull();
    expect(dialog.open).toBe(false);
  });
});
