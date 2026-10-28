# Digest: zxing-wasm (Sec-ant/zxing-wasm) — round 1

## Hard gates

1. Mobile-browser camera, no wrapper — **FAIL as a standalone solution — confirmed decode-only.** README (jsdelivr-hosted, v3.1.0) documents input only as Blob/File/ArrayBuffer/Uint8Array/ImageData — no camera/getUserMedia API at all. The project's own FAQ lists separate wrapper libraries that supply camera UI (`barcode-detector`, `vue-qrcode-reader`, `@yudiel/react-qr-scanner`, `svelte-qrcode-reader`); a dedicated React camera toolkit is only "planned," not shipped. **Team must write/adopt their own getUserMedia → canvas-frame → decode loop, or pull in a wrapper.**
2. EAN-13 decode — PASS. README format table lists `EAN13` (HRI "EAN-13") as both readable and writable, part of the EAN/UPC symbology group.
3. Free/OSS, no key — PASS. zxing-wasm-specific code MIT; bundled zxing-cpp Apache-2.0, zint BSD-3-Clause. No API key; default loads the .wasm binary from free jsDelivr CDN (self-hosting also supported).
4. Testable via HTTPS/localhost, special server setup — PASS with caveats. README doesn't mention COOP/COEP or SharedArrayBuffer (no multithreading header requirement, unlike some other WASM builds). Requirements found: (a) the .wasm binary must be fetchable and version-match the JS package exactly (default: jsDelivr CDN fetch, or pass `wasmBinary`/`locateFile`/Object URL for self-hosting); (b) a strict CSP needs `'wasm-unsafe-eval'` in script-src (secondary source, from the `barcode-detector` wrapper's docs, not zxing-wasm's own README — unverified for zxing-wasm core). Standard HTTPS/localhost rule for getUserMedia applies once camera is wired up (not zxing-wasm-specific).

## Weighted criteria

1. **iOS Safari reliability**
   - **Gap: no direct tested account of zxing-wasm itself running on iOS Safari was found this session.**
   - claim: iOS Safari ties camera permission + playback to a user gesture; scanning should start on tap, not page load. source: jsr.io `@marianmeres/scanner` package docs, undated — confidence: medium, secondary, general iOS-Safari getUserMedia behavior not zxing-wasm-specific.
   - claim: WebKit/Safari does not implement the native BarcodeDetector API. source: eringen.substack.com, ~2025 — confidence: medium, single secondary source. Relevant: confirms the native-API candidate is a non-starter on iOS, making a WASM/JS decoder like zxing-wasm necessary there.

2. **Android Chrome reliability**
   - claim: zxing-wasm works in all modern browsers including Firefox, used as fallback when native BarcodeDetector is absent. source: `mobile_scanner` (Flutter/Dart) docs, pub.dev/juliansteenbakker, undated — confidence: medium, secondary, no direct independent test, only 1 source.

3. **Maintenance status**
   - claim: Repo pushed_at = 2026-10-28 (today), latest release v3.1.6 published 2026-10-19, 288 stars, 2 open / 24 closed issues, single maintainer (Sec-ant), no org. source: GitHub REST API (repo + releases + issues endpoints), live data — confidence: high, primary. **Actively maintained — the strongest maintenance signal of all 4 candidates.**

4. **Integration ease / bundle size**
   - claim: Reader-only subpath wasm binary ≈1.04 MiB on v3.1.0. source: zxing-wasm README, primary — confidence: high.
   - claim: Earlier versions (v2.2.2 reader ≈911KB; deprecated @sec-ant/zxing-wasm reader ≈976KB) consistently show the wasm binary is roughly 1 MiB class regardless of version; JS wrapper itself small, ~37KB min / 13KB gzip. sources: npm/jsDelivr package pages + DepScope/Socket.dev (2 independent secondary sources) — confidence: medium, 2-source bar met.
   - Glue-code burden confirmed non-trivial: must build/borrow camera capture, frame-grab loop, and UI; no built-in scanning UI.

5. **Scan speed / performance (WASM vs pure JS claim)**
   - claim: zxing-wasm had a faster median decode time than Dynamsoft's own commercial SDK (74.10ms vs 100.20ms) across 7,894 real images. source: Dynamsoft benchmark blog (vendor) — confidence: low-medium — vendor-run, and compares zxing-wasm to a *different commercial engine*, not to a pure-JS ZXing port, so does NOT directly evidence "WASM beats pure JS."
   - claim: STRICH (commercial) expects html5-qrcode (pure JS, built on ZXing-JS) performance not to differ meaningfully for simple cases. source: strich.io comparison page (vendor) — confidence: low, vendor/secondary.
   - **Net: the core "WASM is faster than pure JS for EAN-13 decoding" claim could NOT be corroborated by two independent sources — a gap, flagged as unverified.**
   - Tangential: zxing-wasm decodes Micro QR and rMQR codes that @zxing/library (pure JS) cannot. source: dev.classmethod.jp blog (Japanese), single source — confidence: medium. Capability difference, not speed.

## Wildcard lead
**zbar-wasm** — WebAssembly build of the ZBar barcode library, surfaced via alternativeto.net listings as a free/OSS alternative; not researched further. Likely decode-only like zxing-wasm (same camera-wiring problem probably applies).

## Could not find
- Any first-hand tested report of zxing-wasm specifically (not a wrapper) running live on iOS Safari with camera.
- An independent (non-vendor) benchmark comparing zxing-wasm directly against @zxing/library pure-JS decode speed for EAN-13.
- Official npm registry page (npmjs.com returned HTTP 403) — substituted GitHub API + socket.dev/Snyk secondary stats.
- Explicit confirmation/denial of COOP/COEP requirement from a second independent source beyond the README's silence on it.
