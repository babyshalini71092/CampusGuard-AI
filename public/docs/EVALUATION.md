# Evaluation record (actual executions)

All numbers below come from commands run in the project sandbox on 2026-11-26 after the CampusGuard AI student-focused rebrand and engine changes. No accuracy figure is estimated or copied from another project.

## 1. Automated test suite

`npm test` — **40 passed / 40 total**, 2 test files (Vitest, jsdom).

Coverage includes: input validation and normalization; rule matching and negation; financial terms without malicious intent; URL lexical indicators and no-fetch behaviour; cosine similarity; injected-pipeline semantic comparisons; model-load failure fallback; score boundaries and aggregation; empty input; suspicious/legitimate/ambiguous message outcomes; campus-specific rules for internships, faculty impersonation, portals, hostels and events; legitimate campus notices that mention fees or deadlines; disjointness of semantic references and evaluation messages; Student Safety Assessment tiers; campus-aware recovery planning; five simulation scenarios; Analyzer, Screenshot (mocked OCR worker), Student Safety Assessment, Recovery and Awareness integrations; navigation; and script-injection handling.

## 2. Real pretrained model

`npm run test:model` — loaded the vendored `Xenova/all-MiniLM-L6-v2` quantized ONNX from disk in Node and executed inference (not a mock):

| Observation | Result |
|---|---|
| Output shape | 3 messages × 384 dimensions |
| Load + 3 inferences | 0.74–0.77 s across recent runs in this sandbox |
| Cosine: scam vs salary message | 0.361 |
| Cosine: scam vs unrelated meeting | 0.130 |
| Scam similarity margin | +0.100, semantic contribution enabled, score 68 (elevated) |
| Legitimate salary message margin | +0.082, score 10 (few signs) |

The legitimate example's positive margin is not treated as a scam verdict: the rule score is zero, the semantic score maps to a low contribution, and the final score stays low. This illustrates why the semantic component is one weighted signal and not a classifier.

A browser run (`scripts/browser-check.mjs`) independently loaded the same model with ONNX Runtime WASM in Chromium, analyzed a **typed** internship-fee message, and confirmed **ML evidence used** in the result. No CDN requests were needed for the model or runtime.

## 3. Real OCR

`npm run test:ocr` — rendered a PNG containing three lines of text and ran Tesseract.js against the vendored worker/core/language data. Extracted text matched the source lines at 95% reported confidence, including “won Rs 25000 lottery” and “Share your OTP”. The browser run also uploaded a generated screenshot, extracted the text with the local worker, edited it and analyzed it successfully.

## 4. Browser acceptance run

`node scripts/browser-check.mjs` in headless Chromium: **15/15 checks passed** against both the Vite dev server and the production preview build. Verified:

- CampusGuard headline and tagline
- Automatic model initialization on opening the Analyzer
- Typed internship-fee message analyzed with semantic evidence
- Genuine placement notice showing few warning signs
- Local OCR and analysis of extracted text
- Student Safety Assessment escalation
- Recovery plan generation
- Campus Awareness scenario feedback
- Documentation link
- Desktop and 390 px mobile viewports, no horizontal overflow, mobile navigation
- No application console errors (local asset probe aborts are excluded)

Screenshots and machine-readable results are in `evidence/`. No application console or page errors were recorded in the final dev and production runs; `localAssetFetchNoise` was empty.

## 5. Small demonstration evaluation

`npm run test:eval`. A 20-message authored student set, disjoint from the 72 semantic reference examples: 10 suspicious and 10 legitimate, including hard negatives such as urgency without fraud, genuine placement notices, scholarship sanction messages and “no fee” language. Decision rule: warning-sign score ≥40.

| Configuration | TP | FN | FP | TN |
|---|---:|---:|---:|---:|
| Rules only | 10 | 0 | 0 | 10 |
| Hybrid with pretrained model | 10 | 0 | 0 | 10 |

**Do not read this as accuracy.** An earlier version of the authored set produced misses; the rules, strong-indicator floor and reference set were then revised after inspecting those misses, and the final run was measured on the current 20 messages. The set is therefore *not* an independent, blind or representative sample. It is a regression fixture showing that the current implementation handles the authored cases, not evidence of production-grade false-positive or false-negative rates. No claim is made about precision, recall or real-world detection performance.

## 6. Local model lifecycle diagnostic

`node scripts/diagnose-model-loading.mjs` records the real state transition in both dev and production:

- On the overview page the pill reads **ML off**. This is the expected pre-initialization state.
- Opening the Analyzer moves the panel to **Loading** and fetches the local model/tokenizer files and ONNX Runtime WASM. All observed requests returned HTTP 200.
- The panel reaches **ready**, the control reads **Initialized**, and a typed internship-fee message reports **ML evidence used**.
- The manual retry control remains present; if initialization fails, the panel shows the error and analysis continues in rule-based mode.

Machine-readable evidence: `evidence/model-loading-diagnostic.json`. Assets are present in `public/models/minilm`, `public/ort` and `public/tesseract`, and the production build copies them unchanged into `dist/`. The delivered archive is `/home/user/campusguard-ai.zip`; its ONNX, WASM and Tesseract data hashes were checked against the workspace after packaging. An earlier report of a “missing model” was the pre-initialization state, not a missing asset or failed inference. A robustness gap was also fixed: an exception while preparing reference embeddings now moves the UI to `unavailable` with the error instead of leaving it stuck in `loading`.

## 7. Limitations of the evaluation

- No real reported student-scam corpus, no external annotations and no inter-rater reliability check.
- All test messages are English with a few Hinglish-style phrases; regional languages, stylised screenshot fonts and conversational campus scams are underrepresented.
- The semantic reference set and evaluation set share an author; similarity can be sensitive to that author's phrasing.
- OCR accuracy depends on screenshot quality; only one clean rendered English image was tested.
- Browser testing used headless Chromium only; Safari/Firefox and older WASM implementations were not tested.
- The application is not a PWA; full offline operation was not tested. Local assets mean no runtime CDN is required by the code paths exercised.
- The score and category are heuristic. They cannot verify an employer, faculty member, event organiser, portal or payment request.
