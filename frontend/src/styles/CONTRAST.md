# Contrast of design tokens

Every text/background pair the tokens in `tokens.css` are meant to combine, with its
WCAG 2.1 contrast ratio. Text needs at least **4.5:1** (body and small text);
non-text marks (icons, magnets, button fills, the focus ring) need at least **3:1**.

Values are DESIGN.md revision 3 (`ux/felles-design`, PR #17): `colors` for light and
`colors-dark` for dark. When a token value changes, recompute this table.

## Light

| Text / mark | Background | Kind | Ratio | Result |
|---|---|---|---|---|
| `--foreground` (#3A322B) | `--background` (#F7F2E9) | text | 11.27:1 | ok |
| `--foreground` (#3A322B) | `--card` (#FFFDF7) | text | 12.35:1 | ok |
| `--foreground` (#3A322B) | `--note-paper` (#FFF8E2) | text | 11.84:1 | ok |
| `--muted-foreground` (#6B6056) | `--background` (#F7F2E9) | text | 5.49:1 | ok |
| `--muted-foreground` (#6B6056) | `--card` (#FFFDF7) | text | 6.01:1 | ok |
| `--muted-foreground` (#6B6056) | `--note-paper` (#FFF8E2) | text | 5.76:1 | ok |
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
| `--foreground` (#F3E9EE) | `--background` (#221A1F) | text | 14.33:1 | ok |
| `--foreground` (#F3E9EE) | `--card` (#2B2229) | text | 12.98:1 | ok |
| `--foreground` (#F3E9EE) | `--note-paper` (#2E2420) | text | 12.74:1 | ok |
| `--muted-foreground` (#B9A3AE) | `--background` (#221A1F) | text | 7.21:1 | ok |
| `--muted-foreground` (#B9A3AE) | `--card` (#2B2229) | text | 6.54:1 | ok |
| `--muted-foreground` (#B9A3AE) | `--note-paper` (#2E2420) | text | 6.42:1 | ok |
| `--accent-foreground` (#D8B2E3) | `--background` (#221A1F) | text | 9.22:1 | ok |
| `--accent-foreground` (#D8B2E3) | `--card` (#2B2229) | text | 8.36:1 | ok |
| `--primary` (#A86CC0) | `--card` (#2B2229) | non-text | 4.09:1 | ok |
| `--primary` (#A86CC0) | `--background` (#221A1F) | non-text | 4.51:1 | ok |
| `--primary-foreground` (#201620) | `--primary` (#A86CC0) | text | 4.65:1 | ok |
| `--accent-foreground` (#D8B2E3) | `--accent` (#352C3A) | text | 7.25:1 | ok |
| `--food-text` (#7CC9A0) | `--card` (#2B2229) | text | 7.86:1 | ok |
| `--food-text` (#7CC9A0) | `--food-tint` (#1F3329) | text | 6.85:1 | ok |
| `--training-text` (#F29470) | `--card` (#2B2229) | text | 6.78:1 | ok |
| `--training-text` (#F29470) | `--background` (#221A1F) | text | 7.48:1 | ok |
| `--training-text` (#F29470) | `--training-tint` (#3D2920) | text | 6.02:1 | ok |
| `--destructive` (#F28B7F) | `--card` (#2B2229) | text | 6.44:1 | ok |
| `--destructive` (#F28B7F) | `--background` (#221A1F) | text | 7.10:1 | ok |
| `--destructive` (#F28B7F) | `--error-tint` (#3F201C) | text | 6.12:1 | ok |
| `--food` (#5FB98A) | `--food-tint` (#1F3329) | non-text | 5.62:1 | ok |
| `--training` (#EE7D55) | `--training-tint` (#3D2920) | non-text | 5.01:1 | ok |
| `--food` (#5FB98A) | `--card` (#2B2229) | non-text | 6.45:1 | ok |
| `--training` (#EE7D55) | `--card` (#2B2229) | non-text | 5.65:1 | ok |
| `--ring` (#F3E9EE) | `--background` (#221A1F) | non-text | 14.33:1 | ok |
| `--ring` (#F3E9EE) | `--card` (#2B2229) | non-text | 12.98:1 | ok |
| `--muted-foreground` (#B9A3AE) | `--accent` (#352C3A) | text | 5.67:1 | ok |
| `--destructive-foreground` (#221A1F) | `--destructive` (#F28B7F) | text | 7.10:1 | ok |
| `--ring` (#F3E9EE) | `--accent` (#352C3A) | non-text | 11.25:1 | ok |

## Notes

- Light `--training-text` is `#B4451E` (DESIGN.md's earlier `#B9471F` was 4.35:1 on
  `--training-tint`).
- Dark `--primary` is a button fill only (`#A86CC0`, nudged from Karianne's `#A569BD` so
  `--primary-foreground` reaches 4.5:1). It is under 4.5:1 on surfaces, so plum **text** in
  dark mode always uses `--accent-foreground` (`#D8B2E3`).
- `--border` (rule) is decorative only (notebook lines, hairlines) and is never used for
  text or as the only indicator of a control.
- `--food` and `--training` are for icons and magnets only; text uses `--food-text` and
  `--training-text`.
- `--note` (yellow pin) is decorative and never carries text.
