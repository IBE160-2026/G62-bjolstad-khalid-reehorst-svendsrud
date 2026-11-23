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
| `--mark-text` (#7D3F5E) | `--card` (#FFFDF7) | text | 7.52:1 | ok |
| `--mark-text` (#7D3F5E) | `--background` (#F7F2E9) | text | 6.86:1 | ok |
| `--mark-text` (#7D3F5E) | `--mark-tint` (#F2E7EE) | text | 6.35:1 | ok |
| `--mark` (#9C5E87) | `--mark-tint` (#F2E7EE) | non-text | 4.00:1 | ok |
| `--mark` (#9C5E87) | `--card` (#FFFDF7) | non-text | 4.73:1 | ok |
| `--destructive` (#B42318) | `--card` (#FFFDF7) | text | 6.46:1 | ok |
| `--destructive` (#B42318) | `--background` (#F7F2E9) | text | 5.90:1 | ok |
| `--destructive` (#B42318) | `--error-tint` (#FBE9E6) | text | 5.60:1 | ok |
| `--ring` (#3A322B) | `--background` (#F7F2E9) | non-text | 11.27:1 | ok |
| `--ring` (#3A322B) | `--card` (#FFFDF7) | non-text | 12.35:1 | ok |
| `--muted-foreground` (#6B6056) | `--accent` (#F1E7EE) | text | 5.07:1 | ok |
| `--destructive-foreground` (#FFFDF7) | `--destructive` (#B42318) | text | 6.46:1 | ok |
| `--ring` (#3A322B) | `--accent` (#F1E7EE) | non-text | 10.42:1 | ok |
| `--muscle-primary` (#8E1116) | `--card` (#FFFDF7) | non-text | 9.21:1 | ok |
| `--muscle-primary` (#8E1116) | `--muscle-base` (#EEE7DA) | non-text | 7.62:1 | ok |
| `--muscle-secondary` (#D4564B) | `--card` (#FFFDF7) | non-text | 3.95:1 | ok |
| `--muscle-secondary` (#D4564B) | `--muscle-base` (#EEE7DA) | non-text | 3.26:1 | ok |

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
| `--mark-text` (#D8B2E3) | `--card` (#2B2229) | text | 8.36:1 | ok |
| `--mark-text` (#D8B2E3) | `--background` (#221A1F) | text | 9.22:1 | ok |
| `--mark-text` (#D8B2E3) | `--mark-tint` (#372D3C) | text | 7.11:1 | ok |
| `--mark` (#B383C3) | `--mark-tint` (#372D3C) | non-text | 4.34:1 | ok |
| `--mark` (#B383C3) | `--card` (#2B2229) | non-text | 5.10:1 | ok |
| `--destructive` (#F28B7F) | `--card` (#2B2229) | text | 6.44:1 | ok |
| `--destructive` (#F28B7F) | `--background` (#221A1F) | text | 7.10:1 | ok |
| `--destructive` (#F28B7F) | `--error-tint` (#3F201C) | text | 6.12:1 | ok |
| `--ring` (#F3E9EE) | `--background` (#221A1F) | non-text | 14.33:1 | ok |
| `--ring` (#F3E9EE) | `--card` (#2B2229) | non-text | 12.98:1 | ok |
| `--muted-foreground` (#B9A3AE) | `--accent` (#352C3A) | text | 5.67:1 | ok |
| `--destructive-foreground` (#221A1F) | `--destructive` (#F28B7F) | text | 7.10:1 | ok |
| `--ring` (#F3E9EE) | `--accent` (#352C3A) | non-text | 11.25:1 | ok |
| `--muscle-primary` (#FF6B6B) | `--card` (#2B2229) | non-text | 5.55:1 | ok |
| `--muscle-primary` (#FF6B6B) | `--muscle-base` (#352B32) | non-text | 4.90:1 | ok |
| `--muscle-secondary` (#CC5049) | `--card` (#2B2229) | non-text | 3.53:1 | ok |
| `--muscle-secondary` (#CC5049) | `--muscle-base` (#352B32) | non-text | 3.12:1 | ok |

## Notes

- Dark `--primary` is a button fill only (`#A86CC0`, nudged from Karianne's `#A569BD` so
  `--primary-foreground` reaches 4.5:1). It is under 4.5:1 on surfaces, so plum **text** in
  dark mode always uses `--accent-foreground` (`#D8B2E3`).
- `--mark` (mauve) is for icon discs and magnets only; text in the mark colour uses
  `--mark-text`. Mat and Trening share it and are told apart by icon and label.
- `--border` (rule) is decorative only (notebook lines, hairlines) and is never used for
  text or as the only indicator of a control.
- `--note` (yellow pin) is decorative and never carries text.
- `--muscle-primary` / `--muscle-secondary` are the body figure's reds on the exercise page
  (story 4.6) and nothing else; they are kept apart from `--destructive` so a muscle never
  reads as an error. `--muscle-base` is the neutral body fill (decorative, no ratio needed
  against `--card`). The two reds alone differ little
  (2.33:1 light, 1.57:1 dark), so primary vs. secondary is carried by the shape fill, not the
  colour: primary is a solid fill, secondary is diagonal stripes of `--muscle-secondary` over
  `--muscle-base` (in the figure and the legend swatch). The 3:1 rows above still hold.
