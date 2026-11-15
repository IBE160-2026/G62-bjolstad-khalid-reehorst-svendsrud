---
title: 'Story 2.2: Edit my profile'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'f820fd6e73fb1a978cc756fcb137df6145599443'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-2-1-get-my-calorie-target.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user whose weight or goal changes cannot update their profile, so their calorie target goes stale; the Profil page only has log out and delete account.

**Approach:** Show the current target and a form pre-filled with the saved profile on the Profil page. Saving uses the existing `PUT /api/profile` (story 2.1), which recomputes and stores the target; the new number appears at once without a page reload, with a short "Lagret" status. Same validation, messages, focus rules and copy as Profiloppsett. Backend is unchanged: re-save recomputation and cross-user isolation are already covered by `test_second_save_replaces_the_profile` and `test_users_only_see_their_own_profile`.

</frozen-after-approval>

## Implementation Notes

- **Frontend only.** `ProfileForm` gained `initial` (pre-fill via `defaultValue`/`defaultChecked`; weight shown with a decimal comma), `submitLabel`, `pendingLabel`, `onSaved` and `onEdit`. `TargetResult` gained `standalone` (default true): on Profil it does not grab focus or show "Videre".
- **New** `profile-editor.tsx` on `app/profil/page.tsx`: current target, a `role="status"` line ("Lagret. Dagens mål er oppdatert.", cleared on the next edit), and the form ("Lagre endringene" / "Lagrer …"). The profile query waits for consent; loaded data is shown even if a later refetch fails; a missing profile shows a loading line while SessionGuard redirects to Profiloppsett.
- **Copy:** Profil uses its own heading and button labels; validation messages and choice copy are the same as Profiloppsett.
- **Tests:** `profile-editor.test.tsx` (pre-fill, save without reload, validation, "Lagret" cleared, no request before consent, whole-number weight). Backend unchanged; recomputation and isolation are covered by existing 2.1 tests.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Profile fetched before consent (403 flash) | low | No `enabled` gate in `ProfileEditor`; same fix as 2.1 | patch |
| BH | Failed refetch hides loaded data and the form | medium | Error checked before data; React Query keeps data on refetch error | patch |
| BH | User without a profile sees a raw `profile_not_found` alert | low | SessionGuard redirects, but the alert flashes first | patch |
| BH | "Lagret" stays after a new edit or error | low | `saved` never reset; common after a second edit | patch |
| BH | Pending label "Regner ut …" while saving on Profil | low | Hard-coded pending text; one prop | patch |
| BH | Form does not re-sync after save | low | Backend stores what was sent (one decimal enforced); nothing to re-sync | rejected |
| BH | Focus after save untested | low | Focus stays on the button; status line announces the save | rejected |
| BH | More missing tests (GET error, PUT error, `standalone`) | low | PUT/field errors share the 2.1 form tests | rejected |
| BH | Spec has no AC/tasks; notes empty | false | One-shot route uses Intent + notes only | rejected |
| BH | Small code style points | low | Cosmetic | rejected |

