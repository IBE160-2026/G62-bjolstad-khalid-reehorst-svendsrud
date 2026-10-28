# Digest: html5-qrcode (mebjas/html5-qrcode) — round 1

Accessed 2026-10-28 for all GitHub-sourced data unless noted.

## Hard gates

1. Mobile-browser camera, no wrapper — PASS per README platform matrix (full support, Safari iOS + Chrome Android via getUserMedia). Caveat: "works at all" ≠ "decodes reliably" — contradicted by weighted criterion 1 below.
2. EAN-13 decode — PASS. EAN_13 listed in "Supported Code formats" table and `Html5QrcodeSupportedFormats` enum. Decoding delegated to zxing-js under the hood (stated explicitly in README).
3. Free/open, no key — PASS. Apache-2.0 (GitHub API confirmed). No API key/account anywhere in docs.
4. Testable via HTTPS/localhost — PASS but absence-of-evidence: README has no mention of "secure context"/"HTTPS"/"localhost" (grepped directly, no hits) — standard browser rule presumably applies, not a library-specific confirmation.

## Weighted criteria

1. **iOS Safari reliability** — confidence: medium-high, class: performance (2+ independent accounts, same thread)
   - claim: Multiple independent users report EAN-13/barcode (not QR) recognition success rate under 10% on iPhone 13 and 15, vs. fast/reliable recognition on Android with the same library.
     source: GitHub issue #915 "Compatibility - [IOS] [Chrome, Safari] - Iphones aren't reading barcode", opened 2024-04-18, still OPEN (last comment 2025-04-16), 4 comments from 4 different users (mwcz195, d3thomas, chinjon, tomashlavac) — github.com/mebjas/html5-qrcode — accessed 2026-10-28
   - This directly contradicts the README's "full support" badge for iOS Safari/Chrome — real-world testing evidence, not speculation.
   - Secondary: README footnote says Chrome/Firefox on iOS only work from iOS ≥15.1 (WebKit camera-permission restriction); Safari itself has no such version caveat in the table.

2. **Android Chrome reliability** — confidence: medium, class: performance (1 primary + 1 corroborating)
   - claim: Android recognition described as "very fast" by the same iOS-complaint thread, contrasting with iOS. source: issue #915 comment, mwcz195, 2024-05-06.
   - claim: Native-BarcodeDetector-path latency on Android ~23ms (Pixel 4) to 77.5ms (low-end device) vs. 56–373ms with pure ZXing fallback. source: repo's own `experimental.md`, raw file, undated. **Flag: this benchmark is for QR codes per the file's own heading, not confirmed EAN-13-specific — do not over-generalize.**

3. **Maintenance status** — confidence: high, class: version/compatibility (2 independent primary sources)
   - claim: Project explicitly in "maintenance mode until further notice" — maintainer states no bug fixes/improvements, PRs "won't be merged for the timebeing," suggests forking. source: README.md, undated note.
   - claim: Last tagged release v2.3.8, published 2023-04-15; last substantive code commit also 2023-04-15; later repo activity (2023-09, 2024-01, 2025-12) is README-only edits. source: GitHub API /releases and /commits.
   - claim: 448 open issues vs. 334 closed — open now outnumber closed, a stale/backlogged signal. source: GitHub search API.
   - **Net: NOT actively maintained — effectively frozen since April 2023, with the known iOS barcode-accuracy bug (#915) open and unaddressed for 2.5+ years.**

4. **Integration ease** — confidence: high
   - claim: ~5 lines for a working scanner (instantiate `Html5QrcodeScanner`, call `.render()`). Framework-agnostic vanilla-JS core; README lists example wrappers for HTML5, VueJS, ElectronJS, React, Lit — no hard lock-in. source: README code sample.
   - claim: Bundle size 370KB unpacked / ~107KB gzipped, zero runtime deps. source: Bundlephobia query for html5-qrcode@2.3.8 — single-sourced, no second corroborating size source found.

5. **Scan speed / EAN-13 performance under real lighting** — confidence: low. No EAN-13-specific speed/lighting benchmark found anywhere. The only latency numbers (`experimental.md`) are explicitly for QR codes. The iOS low-accuracy reports (#915) describe failure to decode at all (accuracy), not speed. No lighting-condition testing notes found.

## Wildcard lead
**Quagga2** (github.com/ericblade/quagga2) — active MIT-licensed fork of the abandoned QuaggaJS, explicitly built for EAN-13 and other 1D formats via getUserMedia camera streams in-browser. Appears more actively maintained than html5-qrcode per search snippet (npm v1.12.1, ongoing). Not deeply verified — worth a screening pass.

## Could not find
- No EAN-13-specific (vs. QR-specific) performance/lighting benchmark anywhere, official or third-party.
- No npm registry publish-date confirmation for v2.3.8 beyond third-party trackers (GitHub release date 2023-04-15 is the more reliable corroborating figure, matches).
- No explicit library-specific statement about localhost/HTTPS requirements — relying on general web-platform knowledge (getUserMedia requires secure context), flagged as well-known but not separately verified this session.
- Could not determine total contributor count or a commit-frequency trend chart beyond the last-5-commits sample.
