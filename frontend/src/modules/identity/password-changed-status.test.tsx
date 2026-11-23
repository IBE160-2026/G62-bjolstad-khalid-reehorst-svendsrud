import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const searchMock = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchMock.value),
}));

import { PasswordChangedStatus } from "./password-changed-status";

afterEach(() => {
  searchMock.value = "";
});

describe("PasswordChangedStatus", () => {
  it("says the password changed after a reset", () => {
    searchMock.value = "passord=endret";
    render(<PasswordChangedStatus />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Passordet er endret. Logg inn med det nye passordet.",
    );
  });

  it.each(["", "passord=annet", "konto=slettet"])("shows nothing for '%s'", (query) => {
    searchMock.value = query;
    render(<PasswordChangedStatus />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
