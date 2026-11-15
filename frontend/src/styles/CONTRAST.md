# Contrast of design tokens

Every text/background pair the tokens in `tokens.css` are meant to combine, with its
WCAG 2.1 contrast ratio. Text needs at least **4.5:1** (body and small text);
non-text marks (icons, magnets, the focus ring) need at least **3:1**.

Light values are the placeholders from DESIGN.md (`ux/felles-design`, PR #17). Dark values
are derived (not yet in DESIGN.md). When a token value changes, recompute this table.

## Light

| Text / mark | Background | Kind | Ratio | Result |
|---|---|---|---|---|
| `--foreground` (#3A322B) | `--background` (#F7F2E9) | text | 11.27:1 | ok |
| `--foreground` (#3A322B) | `--card` (#FFFDF7) | text | 12.35:1 | ok |
| `--foreground` (#3A322B) | `--note-paper` (#FFF8E2) | text | 11.84:1 | ok |
| `--muted-foreground` (#6B6056) | `--background` (#F7F2E9) | text | 5.49:1 | ok |
| `--muted-foreground` (#6B6056) | `--card` (#FFFDF7) | text | 6.01:1 | ok |
| `--primary` (#7A3B69) | `--background` (#F7F2E9) | text | 7.09:1 | ok |
| `--primary` (#7A3B69) | `--card` (#FFFDF7) | text | 7.77:1 | ok |
| `--primary-foreground` (#FFF9F0) | `--primary` (#7A3B69) | text | 7.55:1 | ok |
| `--accent-foreground` (#7A3B69) | `--accent` (#F1E7EE) | text | 6.55:1 | ok |
| `--food-text` (#2A7350) | `--card` (#FFFDF7) | text | 5.63:1 | ok |
| `--food-text` (#2A7350) | `--food-tint` (#E5EFE6) | text | 4.86:1 | ok |
| `--training-text` (#B4451E) | `--card` (#FFFDF7) | text | 5.42:1 | ok |
| `--training-text` (#B4451E) | `--background` (#F7F2E9) | text | 4.94:1 | ok |
| `--training-text` (#B4451E) | `--training-tint` (#F8E6DC) | text | 4.55:1 | ok |
| `--destructive` (#B42318) | `--card` (#FFFDF7) | text | 6.46:1 | ok |
| `--destructive` (#B42318) | `--background` (#F7F2E9) | text | 5.90:1 | ok |
| `--destructive` (#B42318) | `--error-tint` (#FBE9E6) | text | 5.60:1 | ok |
| `--food` (#2F7D55) | `--food-tint` (#E5EFE6) | non-text | 4.26:1 | ok |
| `--training` (#D9542B) | `--training-tint` (#F8E6DC) | non-text | 3.30:1 | ok |
| `--food` (#2F7D55) | `--card` (#FFFDF7) | non-text | 4.93:1 | ok |
| `--training` (#D9542B) | `--card` (#FFFDF7) | non-text | 3.93:1 | ok |
| `--ring` (#3A322B) | `--background` (#F7F2E9) | non-text | 11.27:1 | ok |
| `--ring` (#3A322B) | `--card` (#FFFDF7) | non-text | 12.35:1 | ok |
| `--muted-foreground` (#6B6056) | `--accent` (#F1E7EE) | text | 5.07:1 | ok |
| `--destructive-foreground` (#FFFDF7) | `--destructive` (#B42318) | text | 6.46:1 | ok |
| `--ring` (#3A322B) | `--accent` (#F1E7EE) | non-text | 10.42:1 | ok |

## Dark

| Text / mark | Background | Kind | Ratio | Result |
|---|---|---|---|---|
| `--foreground` (#F2EAE0) | `--background` (#1E1A17) | text | 14.50:1 | ok |
| `--foreground` (#F2EAE0) | `--card` (#29231F) | text | 13.01:1 | ok |
| `--foreground` (#F2EAE0) | `--note-paper` (#2E2920) | text | 12.12:1 | ok |
| `--muted-foreground` (#BDB0A2) | `--background` (#1E1A17) | text | 8.14:1 | ok |
| `--muted-foreground` (#BDB0A2) | `--card` (#29231F) | text | 7.31:1 | ok |
| `--primary` (#D9A3C8) | `--background` (#1E1A17) | text | 8.25:1 | ok |
| `--primary` (#D9A3C8) | `--card` (#29231F) | text | 7.40:1 | ok |
| `--primary-foreground` (#2A1525) | `--primary` (#D9A3C8) | text | 8.13:1 | ok |
| `--accent-foreground` (#E6B9D8) | `--accent` (#3D2737) | text | 7.96:1 | ok |
| `--food-text` (#7CC9A0) | `--card` (#29231F) | text | 7.91:1 | ok |
| `--food-text` (#7CC9A0) | `--food-tint` (#1F3329) | text | 6.85:1 | ok |
| `--training-text` (#F29470) | `--card` (#29231F) | text | 6.83:1 | ok |
| `--training-text` (#F29470) | `--training-tint` (#3D2920) | text | 6.02:1 | ok |
| `--destructive` (#F28B7F) | `--card` (#29231F) | text | 6.48:1 | ok |
| `--destructive` (#F28B7F) | `--background` (#1E1A17) | text | 7.22:1 | ok |
| `--destructive` (#F28B7F) | `--error-tint` (#3F201C) | text | 6.12:1 | ok |
| `--food` (#5FB98A) | `--food-tint` (#1F3329) | non-text | 5.62:1 | ok |
| `--training` (#EE7D55) | `--training-tint` (#3D2920) | non-text | 5.01:1 | ok |
| `--food` (#5FB98A) | `--card` (#29231F) | non-text | 6.49:1 | ok |
| `--training` (#EE7D55) | `--card` (#29231F) | non-text | 5.68:1 | ok |
| `--ring` (#F2EAE0) | `--background` (#1E1A17) | non-text | 14.50:1 | ok |
| `--ring` (#F2EAE0) | `--card` (#29231F) | non-text | 13.01:1 | ok |
| `--muted-foreground` (#BDB0A2) | `--accent` (#3D2737) | text | 6.41:1 | ok |
| `--destructive-foreground` (#1E1A17) | `--destructive` (#F28B7F) | text | 7.22:1 | ok |
| `--ring` (#F2EAE0) | `--accent` (#3D2737) | non-text | 11.41:1 | ok |

## Notes

- Light `--training-text` was darkened from DESIGN.md's `#B9471F` (4.35:1 on
  `--training-tint`) to `#B4451E` so it passes 4.5:1, pending PR #17.
- `--border` (rule) is decorative only (notebook lines, hairlines: 1.25:1 light,
  1.71:1 dark) and is never used for text or as the only indicator of a control.
- `--food` and `--training` are for icons and magnets only; text uses `--food-text` and
  `--training-text`.
- `--note` (yellow pin) is decorative and never carries text.
