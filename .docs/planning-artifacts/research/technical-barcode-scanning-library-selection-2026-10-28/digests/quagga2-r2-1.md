# Digest: Quagga2 wildcard screening — round 2

Screening pass (lighter budget than the 4 main candidates), accessed 2026-10-28.

## Hard gates

1. Mobile-browser camera, no wrapper — PASS (design intent). README states the library uses getUserMedia directly in-browser. Confidence high for capability existing; NOT independently verified working on an actual iPhone this session (see criterion 2).
2. EAN-13 decode — PASS. README lists `ean_reader` among built-in decoders with an explicit EAN-13 example; sample decode result shows `"format": "ean_13"`.
3. Free/OSS, no key — PASS. Public npm package `@ericblade/quagga2`, MIT-style OSS fork, no account/key needed.
4. Testable via HTTPS/localhost — PASS, with caveat. README explicitly warns getUserMedia requires a secure origin — http:// works only on localhost, all other hosts need https://. No unusual extra setup found within budget.

## Screening criteria

1. **Maintenance status — ACTIVE, more active than html5-qrcode (confirmed, not just assumed):**
   - claim: Latest release v1.13.0 published 2026-10-21, one week before this screening. source: registry.npmjs.org API (dist-tags/time) — confidence: high.
   - claim: Latest commit pushed to default branch 2026-10-28 (today); repo not archived; 63 open issues; 911 stars. source: GitHub REST API — confidence: high.
   - claim: Release cadence roughly monthly over the past year. source: github.com/ericblade/quagga2/releases — confidence: medium (exact years for older tags not confirmed).
   - Verdict: the "more actively maintained than html5-qrcode" claim from the html5-qrcode and zxing-js assistants is CONFIRMED — a real, live, frequently-touched repo, unlike html5-qrcode's frozen-since-April-2023 state.

2. **iOS Safari reliability — UNRESOLVED / MODERATE RISK, same central risk as every other candidate.**
   - claim: No quagga2-specific GitHub issue confirming reliable EAN-13 scans on a real iPhone was found at screening depth; closest hit was an old QuaggaJS (original, not quagga2) issue reporting no scanner results on iOS 14, attributed to an `aspectRatio: {ideal:1}` camera constraint, pointing to quagga2 issue #419 (not opened/confirmed this session). source: lightrun.com mirror of a QuaggaJS issue thread — confidence: low, indirect (about original QuaggaJS, not quagga2; linked issue not independently verified).
   - No blog posts or first-hand "shipped on iPhone" accounts found within the 6-call budget. **Genuine gap — flag for a deeper pass if Quagga2 advances.**

3. **Integration ease / bundle size — partially checked.**
   - claim: Requires explicit reader configuration (`readers: ['ean_reader', ...]`), framework-agnostic vanilla JS/TS, no React/Vue lock-in. source: README — confidence: high.
   - Bundle size: NOT VERIFIED — npmjs.com package page returned HTTP 403. No confirmed size figure; do not cite one.

4. **Red flags — none found that would disqualify outright.** Actively pushed to as of today, not archived, reasonably popular (911 stars), EAN-13 capability documented and built-in. Only real open question is real-device iOS Safari behavior — unverified in either direction, not "broken," just unconfirmed.

## Verdict (per the assistant)
Quagga2 passes all 4 hard gates on paper and is genuinely, verifiably more actively maintained than html5-qrcode. Credible 5th finalist worth carrying into the comparison, but NOT safely ahead of the pack — the one load-bearing unknown for this whole project (iOS Safari camera + EAN-13 reliability) was not resolved for Quagga2 specifically; only adjacent, lower-confidence signals were found. Recommend: keep it in, but earmark "iOS Safari real-device EAN-13 test" as the first thing a deeper dive or the team's own hands-on test must settle before ranking it against the other 3 candidates.
