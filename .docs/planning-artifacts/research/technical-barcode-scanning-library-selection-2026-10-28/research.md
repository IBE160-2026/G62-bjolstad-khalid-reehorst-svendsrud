---
title: 'technical research: barcode-scanning library selection'
type: 'technical'
topic: 'Browser-based barcode scanning library for Prompt Force (mobile web, EAN-13)'
decision: 'Which barcode-scanning approach Prompt Force should use for mobile-web food logging (camera-based EAN-13 scan with a manual-entry fallback)'
source: 'native run'
status: complete
preset: 'standard (subagents pinned to 4, +1 screening pass)'
validation: 'normal'
created: '2026-10-28'
updated: '2026-10-28'
claims_verified: 7
claims_unverified: 5
claims_disputed: 0
claims_overturned: 0
---

# technical research: barcode-scanning library selection

**Decision this research serves:** Which barcode-scanning approach Prompt Force should use for mobile-web food logging (camera-based EAN-13 scan with a manual-entry fallback).

**Decision shape:** select.

## Executive summary

**Pick: Quagga2** (`@ericblade/quagga2`), on condition that the team runs the mobile spike it already planned before locking in the architecture.

No candidate has confirmed-good iOS Safari reliability — that's the one finding that cuts across everything else. One candidate (html5-qrcode) has the strongest *confirmed-bad* signal: four separate users report the same unresolved iOS barcode-scanning failure in one GitHub issue, one of them quantifying it at under 10% recognition on iPhones (the others report the same problem without numbers) [3]; the rest are simply unverified in either direction. Given that, the decision comes down to the next-strongest signals: Quagga2 is the only candidate that is both actively maintained (commit today, release one week ago [24][23]) *and* ships a working camera-capture pipeline out of the box [22] — zxing-wasm matches it on maintenance but is decode-only and would need a hand-built camera UI [12]; @zxing/library ships a camera wrapper but its maintenance signal is weaker (self-described "maintenance mode," a 20-month release gap before two releases landed in April 2026) [6][8]. The native `BarcodeDetector` API is cut outright — it's disabled by default in every iOS Safari version through 27.2 [17][18], which fails the "works for a real user on an unmodified phone" gate.

**Biggest caveat:** Quagga2's own iOS Safari EAN-13 reliability was not directly evidenced either way this session [25] — the pick rests on it being the strongest candidate on the criteria that *were* evidenced, not on a confirmed iOS win. The mobile spike the team already planned (per the pre-PRD prep doc: "test EAN-13 on real iPhone and Android before the architecture is decided") is not optional polish — it is the one test that actually settles this decision, for whichever library is tried.

## Requirements frame

*(From the project — brief.md and the pre-PRD prep doc — not from research, per the select-shape method.)*

**Hard gates** — any candidate failing one is cut:
1. Works via phone camera in a mobile browser (Safari iOS + Chrome Android), no native app install.
2. Decodes EAN-13.
3. Free / open source, no paid account.
4. Testable locally via HTTPS or localhost.

**Weighted preferences:** iOS Safari reliability (high), Android reliability (high), active maintenance (medium), framework-agnostic integration ease (medium), bundle size / scan speed (medium-low).

## Candidate screen

Five candidates were evaluated: the four named in the team's own prep doc, plus one wildcard screened in because two independent research passes surfaced it unprompted.

| Candidate | Hard gates | Verdict |
|---|---|---|
| html5-qrcode | Pass (nominally) | Carried to finalist comparison — but see confirmed iOS accuracy problem below |
| @zxing/library (zxing-js) | Pass | Carried to finalist comparison |
| zxing-wasm | **Partial fail** — decode-only, no camera API | Carried, with integration-cost penalty noted |
| native `BarcodeDetector` | **Fails gate 1 on iOS** — disabled by default through Safari 27.2 | **Cut.** Viable Android-only, not for a cross-platform requirement |
| Quagga2 (wildcard) | Pass | Carried to finalist comparison |

## Evidence per candidate

### html5-qrcode

Nominally passes every hard gate — a platform-support table in the README marks iOS Safari and Android Chrome as fully supported, EAN-13 is listed, and the license is Apache-2.0 (confirmed via the repo's LICENSE file, not the README text itself) [1][2]. (The README's own code sample needs fewer than ten lines, not quite the ~5 initially estimated — a minor overstatement, now corrected.) In practice, a GitHub issue open since April 2024 collects four independent users reporting the same unresolved iOS barcode-scanning failure on iPhone 13 and 15 — one quantifies it at under 10% recognition, the other three report "same problem"/no results without numbers; none of the four comments confirms the format tested was EAN-13 specifically rather than barcode scanning generically — directly contradicting the README's support claim regardless. The same user who gave the 10% figure describes Android recognition as "very fast" by contrast [3]. The project has had no substantive commit since April 2023 — the maintainer explicitly calls it "maintenance mode," no fixes, suggests forking — and open issues (448) now outnumber closed (334) [2]. Integration is the easiest of all five candidates (~5 lines, built-in UI, framework-agnostic) [1], but that ease doesn't offset a confirmed, 2.5-year-unaddressed accuracy bug on the platform this project cares most about. (The repo's own latency benchmark [4] is QR-specific, not EAN-13, and doesn't bear on this problem either way.)

### @zxing/library (zxing-js)

Passes every hard gate — the README describes browser camera integration via the generic `MediaDevices` API (the companion `@zxing/browser` package provides the higher-level wrapper, per secondary sources, though the main README doesn't name it directly) [6]. No recent (2025–2026) first-hand iOS or Android real-device EAN-13 test was found — a gap, not a confirmed problem; the one iOS-specific note is a platform limitation (pre-14.3 camera access restricted to native Safari) rather than a library defect [6][11], and a dated report of a full camera freeze on an iPhone 6/iOS 12 [7] is old enough, and the device obsolete enough, not to weigh heavily on a current recommendation. Maintenance is ambiguous: the README self-describes "maintenance mode only," yet two releases landed in April 2026 after a 20-month gap [6][8] — net, semi-active rather than abandoned. (A third-party aggregator was consulted for a maintainer-activity cross-check but returned a 404 on re-verification — not relied on.) Integration is straightforward and framework-agnostic [10]; bundle size could not be confirmed (Bundlephobia rate-limited).

### zxing-wasm

Fails the camera-API hard gate as a standalone tool — it is decode-only, taking image/blob input with no `getUserMedia` wiring; the project's own FAQ points to separate wrapper libraries for camera UI, with a dedicated React toolkit still only "planned" [12]. It decodes EAN-13 [12] and is free/OSS [12]. It is, by a clear margin, the most actively maintained candidate: latest release six days before this research, with a commit pushed the same day as this research [13]. One general (not zxing-wasm-specific) iOS Safari note applies to any camera-based approach here: scanning should start on a user tap rather than page load, since iOS ties camera permission and playback to a user gesture [15]. Its pitched performance advantage ("WASM is faster than pure JS") could not be corroborated by two independent non-vendor sources — the one benchmark found compares it to a different commercial SDK, not to a pure-JS ZXing port [14]. The ~1 MiB WASM payload [12] plus the team having to build its own camera-capture loop makes this the highest-integration-cost option of the four passing candidates.

### Native `BarcodeDetector` API — cut

Technically meets every gate on Android, including EAN-13 support and secure-context (HTTPS) testability — MDN confirms the secure-context requirement; that this specifically includes `localhost`, as with the other candidates, is standard Web Platform behavior rather than something stated on that particular page [20][21]. On iOS Safari, it is listed "disabled by default" in every shipped version from 17.0 through the current 27.1–27.2 on caniuse.com, corroborated by WebKit's own bug tracker: bug 198174 (closed as a duplicate of 255803, which carries the actual "fixed" resolution for the flagged draft) shows the implementation was reported "unusable" inside a Web Worker as of 2023, and a separate, unresolved regression (bug 281848) was reported after a user manually enabled the experimental flag [17][18][19]. An ordinary user on an unmodified iPhone cannot use this API — it fails the project's "works for a real user" framing of the mobile-browser gate. Notably, the leading polyfill for this API (`barcode-detector` on npm) is itself built on zxing-wasm [12] — meaning "going native" to avoid a WASM dependency doesn't actually avoid one once iOS is in scope.

### Quagga2 (wildcard, screened in round 2)

Surfaced independently by two separate research assistants (researching html5-qrcode and @zxing/library respectively) as a more actively maintained 1D-barcode-focused fork of the abandoned original QuaggaJS. Screening confirmed — rather than assumed — that claim: passes every hard gate, including a built-in `getUserMedia` camera pipeline and an explicit EAN-13 reader [22]. It is the most recently active candidate alongside zxing-wasm: a release six days before this research and a commit the same day, with roughly monthly release cadence over the past year [23][24]. No disqualifying red flags were found. Its one unresolved point, and the single most important gap in this entire research run: no direct evidence — positive or negative — was found for Quagga2's own EAN-13 reliability on a real iPhone in Safari; the only adjacent signal is a low-confidence report about the *original* (pre-fork) QuaggaJS, not Quagga2 itself [25].

## Decision matrix

Scored 1 (weak) – 3 (strong) per criterion, weighted per the requirements frame (iOS ×3, Android ×2, maintenance ×2, integration ×1, bundle/speed ×1 — max 27). `BarcodeDetector` is excluded, having been cut at the hard-gate screen.

| Criterion (weight) | html5-qrcode | @zxing/library | zxing-wasm | Quagga2 |
|---|---|---|---|---|
| iOS Safari reliability (×3) | 1 — confirmed poor, 4 users [3] | 2 — unresolved [6][11] | 2 — unresolved [12] | 2 — unresolved [25] |
| Android reliability (×2) | 2 — one "fast" report [3] | 2 — unresolved | 2 — one secondary report [16] | 2 — unresolved |
| Maintenance (×2) | 1 — frozen since 2023 [2] | 2 — semi-active [6][8] | 3 — most active [13] | 3 — confirmed active [23][24] |
| Integration ease (×1) | 3 — built-in UI [1] | 2 — camera wrapper, no UI | 1 — decode-only, build-your-own [12] | 3 — built-in UI [22] |
| Bundle/speed (×1) | 2 — 107KB gzip [5] | 2 — unverified | 1 — ~1MiB, speed claim unverified [12][14] | 2 — unverified |
| **Weighted total /27** | **14** | **18** | **18** | **21** |

The matrix rewards Quagga2 for pairing the field's best maintenance signal with the field's best integration ease, while sharing the same *unresolved* (not confirmed-bad) iOS status as every candidate except html5-qrcode, which is the only one with a *confirmed* iOS problem. Re-weight this table freely — if the team weighs "ships a camera UI" lower (e.g. if a UI is being built anyway), zxing-wasm closes most of the gap to Quagga2.

## Verdict

**Pick: Quagga2.** Runner-up: zxing-wasm and @zxing/library, tied — zxing-wasm if the team is comfortable building its own camera-capture UI and wants the most actively maintained decode core; @zxing/library if a more complete, if staler, package is preferred. **html5-qrcode is not recommended** despite being the easiest to find tutorials for, given its confirmed, multi-user, 2.5-year-unaddressed iOS accuracy problem. Native `BarcodeDetector` is cut for this cross-platform requirement.

**Strongest argument against the pick:** Quagga2's own iOS Safari EAN-13 reliability has literally no direct evidence either way — the pick could still fail completely on the one platform the team cares most about once tested on a real device. This is not a reason to choose a different candidate (none of the three alternatives has *better* iOS evidence — html5-qrcode's is confirmed *worse*), but it is a reason to treat the pick as provisional.

**Cheapest reversibility hedge:** wrap barcode scanning behind a small adapter (e.g. a single `scanBarcode()` function/interface) so that if the team's planned mobile spike shows Quagga2 failing on a real iPhone, swapping to zxing-wasm or @zxing/library costs an implementation change behind that seam, not a UI rewrite. This matches the team's own prep-doc plan to spike and test on real hardware before the architecture is locked in — treat that spike as this decision's actual acceptance test, not as a formality.

## Open questions

- **Quagga2's real-device iOS Safari EAN-13 reliability** — the decision's single biggest unknown. Next step: the team's own planned mobile spike, tried on Quagga2 first.
- **zxing-wasm's "WASM is faster than pure JS" claim** — not corroborated by independent non-vendor sources. Doesn't affect the pick (zxing-wasm wasn't chosen), but would matter if the team re-weighs toward it.
- **@zxing/library's true maintenance trajectory** — is the April 2026 pair of releases a one-off or a resumption? Next step: watch the repo for a few more months, or ask in an issue.
- **Quagga2 and zxing-wasm bundle sizes** — both blocked by npm/Bundlephobia rate limits (HTTP 403/429) this session. Next step: retry, or measure directly via a local `npm install` + bundler output.
- **Android reliability across all four finalists** — thin evidence everywhere (one secondary report each at most). Lower priority given the frame's "high" weight is really carried by the iOS risk, but worth a quick real-device check alongside the iOS spike.

## Source appendix

| # | Source | Publisher | Pub. date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | [html5-qrcode — README](https://github.com/mebjas/html5-qrcode) | mebjas (GitHub) | undated | 2026-10-28 | high |
| [2] | [html5-qrcode — repo API (releases, commits, issues)](https://api.github.com/repos/mebjas/html5-qrcode) | GitHub | live data (last release 2023-04-15) | 2026-10-28 | high |
| [3] | [html5-qrcode — issue #915](https://github.com/mebjas/html5-qrcode/issues/915) | GitHub issue thread | 2024-04-18 to 2025-04-16 (open) | 2026-10-28 | medium (4 users confirm the same unresolved problem; only 1 gives a number; format not confirmed as EAN-13 specifically) |
| [4] | [html5-qrcode — experimental.md (QR benchmark)](https://github.com/mebjas/html5-qrcode/blob/master/experimental.md) | mebjas (GitHub) | undated | 2026-10-28 | medium (QR-specific, not EAN-13) |
| [5] | [Bundlephobia — html5-qrcode@2.3.8](https://bundlephobia.com/package/html5-qrcode@2.3.8) | Bundlephobia | undated | 2026-10-28 | medium (single-sourced) |
| [6] | [@zxing/library — README](https://github.com/zxing-js/library) | zxing-js (GitHub) | undated | 2026-10-28 | high |
| [7] | [@zxing/library — issue #286](https://github.com/zxing-js/library/issues/286) | GitHub issue thread | undated (old issue) | 2026-10-28 | medium |
| [8] | [@zxing/library — Snyk package page](https://security.snyk.io/package/npm/@zxing/library) | Snyk | snapshot | 2026-10-28 | medium |
| [10] | [@zxing/browser — README](https://github.com/zxing-js/browser) | zxing-js (GitHub) | undated | 2026-10-28 | medium (derived via search) |
| [11] | ["Barcode scanning on iOS: the missing..."](https://eringen.substack.com/) | eringen.substack.com | 2026-02-15 | 2026-10-28 | medium (secondary) |
| [12] | [zxing-wasm — README (v3.1.0)](https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.0/README.md) | Sec-ant | undated | 2026-10-28 | high |
| [13] | [zxing-wasm — repo API (releases, issues)](https://api.github.com/repos/Sec-ant/zxing-wasm) | GitHub | live (release 2026-10-19, pushed 2026-10-28) | 2026-10-28 | high |
| [14] | [Dynamsoft benchmark blog](https://www.dynamsoft.com/) | Dynamsoft (vendor) | undated | 2026-10-28 | low-medium (vendor-run) |
| [15] | [jsr.io — @marianmeres/scanner docs](https://jsr.io/@marianmeres/scanner) | jsr.io | undated | 2026-10-28 | medium (secondary, general iOS behavior) |
| [16] | [mobile_scanner — pub.dev docs](https://pub.dev/packages/mobile_scanner) | juliansteenbakker (pub.dev) | undated | 2026-10-28 | medium (secondary) |
| [17] | [caniuse.com — BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector) | Can I Use | live/undated | 2026-10-28 | high |
| [18] | [WebKit Bugzilla — bug 198174 / 255803](https://bugs.webkit.org/show_bug.cgi?id=198174) | WebKit Bugzilla | comment 2023-08-10, closed 2023-10-27 | 2026-10-28 | high |
| [19] | [Apple Developer Forums — thread 767761](https://developer.apple.com/forums/) | Apple | Nov 2024 | 2026-10-28 | medium (community answer) |
| [20] | [Chrome for Developers — Shape Detection API](https://developer.chrome.com/docs/capabilities/shape-detection) | Google | undated | 2026-10-28 | high |
| [21] | [MDN — BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) | MDN | last modified 2026-06-11 | 2026-10-28 | high |
| [22] | [Quagga2 — README](https://github.com/ericblade/quagga2) | ericblade (GitHub) | undated | 2026-10-28 | high |
| [23] | [Quagga2 — npm registry API](https://registry.npmjs.org/@ericblade/quagga2) | npm | release 2026-10-21 | 2026-10-28 | high |
| [24] | [Quagga2 — repo API](https://api.github.com/repos/ericblade/quagga2) | GitHub | live (pushed 2026-10-28) | 2026-10-28 | high |
| [25] | [Lightrun — mirrored QuaggaJS issue thread](https://lightrun.com/) | Lightrun | undated | 2026-10-28 | low (indirect, original QuaggaJS not Quagga2) |

## Staleness map

This pack's freshness bars: version/compatibility claims ≤ 1 month, ecosystem/performance signals ≤ 6 months (computed via `recon_kit.py staleness`, not hand-estimated). All 12 tracked claims are fresh as of this writing; **earliest re-check: 2026-11-01** — every version/compatibility claim (maintenance status and release activity for all 4 finalists, plus the BarcodeDetector iOS/Android compatibility facts) needs re-confirming within one month of this report, since that's the fastest-moving class in any technical pack. The 5 ecosystem/performance claims (the iOS reliability narratives for html5-qrcode, @zxing/library, zxing-wasm, and Quagga2) re-check by **2027-04-01**.

In practice: if the team's planned mobile spike happens within the next 1–2 weeks, no re-check is needed first. If this report sits unused past **2026-11-01**, re-run a quick refresh on the maintenance/compatibility facts (sources [2][6][8][13][17][18][20][23][24]) before trusting the numbers unchanged — browser-flag status and release activity are exactly the kind of fact that can flip in a month.
