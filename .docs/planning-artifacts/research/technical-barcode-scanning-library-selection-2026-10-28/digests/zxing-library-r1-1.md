# Digest: @zxing/library (zxing-js) — round 1

## Hard gates

1. Mobile-browser camera, no wrapper — PASS with caveat. Integrates via companion `@zxing/browser` package (`BrowserMultiFormatReader.decodeFromVideoDevice`), using MediaDevices/getUserMedia. source: GitHub README, undated. Caveat (library-stated, platform limitation not a bug): on iOS <14.3, camera access works only in native Safari, not other iOS browsers or embedded webviews.
2. EAN-13 decode — PASS. Explicitly listed in the supported 1D product-format table. source: README.
3. Free/open, no key — PASS. Apache-2.0 (MIT before v0.22.0). No account/key, purely client-side. source: security.snyk.io package page.
4. Testable via HTTPS/localhost — PASS, standard requirement only; no zxing-js-specific extra setup found. Flagged: this is the generic Web platform rule, not something explicitly stated in zxing-js's own docs.

## Weighted criteria

1. **iOS Safari reliability**
   - claim: On iOS <14.3, camera access works only in native Safari, not other browsers or in-app webviews (Apple's limited WebRTC support). source: zxing-js/library README Limitations section — confidence: high (primary) — single source.
   - claim: An iPhone 6 on iOS 12 froze the app when Safari opened the camera full-screen; Chrome on the same device couldn't open the camera at all. source: github.com/zxing-js/library issue #286 — confidence: medium (old device/OS, dated).
   - claim: Safari/WebKit (all iOS browsers) lacks the native BarcodeDetector API, so JS decoders are the only option on iOS; dropped frames/slow detection can hurt UX especially on older devices. source: eringen.substack.com, 2026-02-15 — confidence: medium (discusses JS decoders generally, doesn't test zxing-js directly).
   - **Gap: no source found reporting a specific, recent (2025–2026) real-device test of zxing-js EAN-13 scanning on current iOS Safari.**

2. **Android Chrome reliability** — **Gap: no specific recent real-world Android Chrome testing account for zxing-js found this session.**

3. **Maintenance status**
   - claim: README headed "Project in Maintenance Mode Only," changes driven by contributed patches only, maintainers open to new maintainers taking over. source: GitHub README, direct repo check — confidence: high.
   - claim: Despite "maintenance mode" framing, two releases (0.22.0, 0.23.0) published April 2026, after prior release 0.21.3 from August 2024 — a ~20-month gap. source: security.snyk.io version history — confidence: medium.
   - claim: Ecosyste.ms lists 0 active maintainers, last push 2024-09-28; GitHub shows 172 open issues, 11 open PRs, no confirmed 2026-dated maintainer responses found. source: awesome.ecosyste.ms + direct GitHub fetch — confidence: medium.
   - **Net: "unmaintained" claim PARTIALLY CONFIRMED — self-described maintenance-mode (patches only, no active roadmap), consistent with low commit/issue-response activity, but NOT formally archived and did receive two releases in April 2026.**

4. **Integration ease**
   - claim: Basic scanning via `@zxing/browser`'s `BrowserMultiFormatReader.decodeFromVideoDevice(deviceId, videoElementId, callback)`, returns controls object with `.stop()`; framework-agnostic plain JS/TS, no React/Angular/Vue lock-in. source: github.com/zxing-js/browser README, derived via search, not raw-fetched — confidence: medium.
   - claim: A GitHub issue reports `decodeOnceFromVideoDevice` silently failing (NotFoundException) while continuous `decodeFromVideoDevice` worked, on an older @zxing/browser version. source: github.com/zxing-js/browser issue #41 — confidence: low-medium (may be fixed since).
   - Bundle size: **not obtained** — Bundlephobia request rate-limited (HTTP 429).

5. **Scan speed / EAN-13 performance** — **Gap: no zxing-js-specific EAN-13 throughput/latency number found.** One performance data point found (frame-rate ~150ms, crash-after-70s memory bug) belongs to a different ZBar-WASM-based scanner in the Substack post, NOT zxing-js — flagged as not applicable, excluded as evidence.

## Wildcard lead
**Quagga2** (`@ericblade/quagga2`, maintained fork of QuaggaJS) — free, open-source (MIT), 1D-barcode-focused (fits EAN-13), came up repeatedly in 2025 comparison articles as a maintained alternative. Not deeply researched. source: dev.to/yurich84 comparison article + alternativeto.net listing — confidence: low (not verified against its own repo this session). **Second independent mention of this same wildcard (also surfaced by the html5-qrcode research assistant) — stronger signal to screen it.**

## Could not find
- A recent (2025–2026) first-hand test specifically of zxing-js (not a competitor) scanning EAN-13 on a current iPhone in Safari.
- Any Android Chrome-specific real-world account for zxing-js.
- Verified bundle size (Bundlephobia rate-limited).
- A single authoritative last-commit-date (conflicting dates: 2024-09-28 push vs. April 2026 npm releases).
