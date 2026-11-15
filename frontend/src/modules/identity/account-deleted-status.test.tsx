import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const searchMock = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchMock.value),
}));

import { AccountDeletedStatus } from "./account-deleted-status";

afterEach(() => {
  searchMock.value = "";
});

describe("AccountDeletedStatus", () => {
  it("says the account was deleted after a deletion", () => {
    searchMock.value = "konto=slettet";
    render(<AccountDeletedStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Kontoen din er slettet.");
  });

  it.each(["", "konto=annet", "slettet=konto"])("shows nothing for '%s'", (query) => {
    searchMock.value = query;
    render(<AccountDeletedStatus />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
