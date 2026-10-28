# Digest: native BarcodeDetector Web API — round 1

**Bottom line:** Fails the iOS Safari gate as experienced by a real end user — flag-gated behind an experimental setting in every shipped version through 27.2, with an open unresolved regression even when manually enabled. Viable on Android Chrome only, and even there depends on Google Play Services being present/current. Any cross-platform solution still needs a WASM-based fallback for iOS, undercutting the "no library" selling point.

## Hard gates

1. Mobile-browser camera use, no app wrapper — **PARTIAL PASS / FAIL on iOS.** Android: works via getUserMedia + BarcodeDetector on macOS/ChromeOS/Android per Chrome's own docs. iOS Safari: BarcodeDetector is "Disabled by default" in every shipped version 17.0–27.2 per caniuse.com — an ordinary user on an unmodified iPhone cannot use it (would require enabling an experimental Safari flag). **Gate fails for iOS as a real-world requirement.**
2. EAN-13 decode — PASS where the API runs at all (ean_13 explicitly listed in Chrome's sample getSupportedFormats() and MDN's example). Not confirmed for Safari since Safari support is flag-gated/non-default.
3. Free/open, no hidden cost — PASS (no license/key); Android has a real *platform* dependency (Google Play Services), not a cost.
4. Testable locally via HTTPS/localhost — PASS (MDN: requires secure context, localhost included).

## Weighted criteria

1. **iOS Safari reliability (central question):**
   - claim: BarcodeDetector listed "Disabled by default" in every iOS Safari version 17.0 through current 27.1–27.2, no version shown enabled by default.
     source: caniuse.com (mdn-api_barcodedetector page) — Can I Use — live/undated — accessed 2026-10-28 — confidence: high — class: version/compat
   - claim: Safari implemented a first draft of Shape Detection via the Vision framework behind a "Shape Detection API" flag (confirmed present in Safari Technology Preview 176, Aug 2023); BarcodeDetector inside a Web Worker reported "unusable" even with the flag on.
     source: bugs.webkit.org bug 198174 (dup of bug 255803, resolved fixed for the flagged draft) — WebKit Bugzilla — comment dated 2023-08-10, bug closed 2023-10-27 — accessed 2026-10-28 — confidence: high — class: version/compat (corroborates caniuse — 2-source bar met)
   - claim: Users who manually enabled the flag in Safari 17.x found the API stopped detecting codes after upgrading to iOS 18.0, tracked as WebKit bug 281848, unresolved as of the reply.
     source: Apple Developer Forums thread 767761 — Apple — thread Nov 2024 — accessed 2026-10-28 — confidence: medium (community answer, not official Apple statement) — class: narrative
   - Verified precisely: this is NOT iOS doing barcode detection via VisionKit/Live Text under the BarcodeDetector name — it's a genuinely flagged, off-by-default, buggy WebKit feature. No evidence of Apple exposing VisionKit recognition through the BarcodeDetector API surface.

2. **Android Chrome reliability:**
   - claim: Barcode detection in Chrome available on macOS, ChromeOS, and Android; Google Play Services required on Android.
     source: developer.chrome.com/docs/capabilities/shape-detection — Chrome for Developers (Google) — undated — accessed 2026-10-28 — confidence: high — class: version/compat
   - Implication: on Android devices without Google Play Services (some China-market phones, de-Googled ROMs) or outdated ML Kit, constructor can exist but detect()/getSupportedFormats() can still fail. Chrome's own docs explicitly warn constructor presence ≠ platform support, recommend catching NotSupportedError from detect() rather than only feature-detecting the class.

3. **Polyfill / WASM fallback:**
   - claim: npm package `barcode-detector` (by Sec-ant) is a BarcodeDetector polyfill/ponyfill built on zxing-wasm (ZXing-C++ to WebAssembly), fetching a .wasm file at runtime; recent versions (3.0.x–3.2.1) bumped zxing-wasm versions, consistent with ongoing upkeep.
     source: jsdelivr-hosted README for barcode-detector@3.2.1 + npm/socket.dev/depscope listings — package README / npm ecosystem — undated (3.2.1 seen) — accessed 2026-10-28 — confidence: medium (npmjs.com itself returned 403, exact last-publish date unconfirmed) — class: narrative
   - Implication: using this polyfill to fill the iOS gap means shipping a WASM decoder for iOS anyway — same cost category as using zxing-wasm directly.

4. **Integration ease:** Native path (where it works) needs only a few lines (open camera stream, construct BarcodeDetector, call detect() in a loop) — no bundle weight. But Chrome's guidance requires defensive coding around getSupportedFormats()/NotSupportedError per platform, and because iOS needs a full fallback (polyfill or different library), the team ends up shipping/maintaining a WASM/JS decoder path for iOS regardless — the "less code" benefit only materializes for Android-only builds. No LOC-quantified comparison found.

5. **Scan speed/performance:** No benchmarked, session-verified evidence comparing native BarcodeDetector decode speed to zxing-wasm/html5-qrcode. A Dynamsoft benchmark page surfaced in search snippets compares other SDKs, not the browser API — not used as evidence since not directly fetched/verified. Reported as not found, not asserted either direction.

## Wildcard lead
`barcode-detector-zbar` (npm/unpkg) — a BarcodeDetector polyfill using zbar.wasm instead of zxing-wasm — surfaced as a possible 5th decoder option, not researched further.

## Could not confirm / not found
- Exact current npm "last published" date for `barcode-detector` (npmjs.com blocked fetch with 403).
- Any quantified native-vs-WASM decode speed benchmark specific to the BarcodeDetector API.
- Whether desktop Chrome on Windows/Linux supports BarcodeDetector (Chrome's own docs list only macOS/ChromeOS/Android) — not pursued, out of scope (mobile-only decision).
- Official Apple statement (vs. community bug reports) on whether/when BarcodeDetector ships unflagged in Safari.
