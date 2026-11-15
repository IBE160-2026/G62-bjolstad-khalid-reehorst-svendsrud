"use client";

import { useLogout } from "./api";
import { SECONDARY_BUTTON_CLASS } from "./styles";

export function LogoutButton() {
  const logout = useLogout();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className={SECONDARY_BUTTON_CLASS}
      >
        {logout.isPending ? "Logger ut …" : "Logg ut"}
      </button>
      {logout.error && (
        <p role="alert" className="text-small text-destructive">
          {logout.error.message}
        </p>
      )}
    </div>
  );
}
