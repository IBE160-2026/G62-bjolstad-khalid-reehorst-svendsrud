"use client";

import { useState, type FormEvent } from "react";

import { useGiveConsent } from "./api";
import { PRIMARY_BUTTON_CLASS } from "./styles";

export function ConsentForm() {
  const consent = useGiveConsent();
  const [accepted, setAccepted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted || consent.isPending) return;
    consent.mutate();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      {/* The whole row is the label, so the tap target is at least 44 px high. */}
      <label
        htmlFor="consent-accept"
        className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-foreground"
      >
        <input
          id="consent-accept"
          name="accept"
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="size-6 shrink-0 cursor-pointer accent-primary"
        />
        <span>Jeg har lest dette og godtar at Prompt Force lagrer disse opplysningene.</span>
      </label>

      {consent.error && (
        <p role="alert" className="text-small text-destructive">
          {consent.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!accepted || consent.isPending}
        className={PRIMARY_BUTTON_CLASS}
      >
        {consent.isPending ? "Lagrer …" : "Godta og fortsett"}
      </button>
    </form>
  );
}
