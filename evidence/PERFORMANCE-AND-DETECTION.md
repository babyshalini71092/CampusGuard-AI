# Windows performance and held-out detection evaluation

## Detection protocol

The frozen corpus contains 108 separately authored synthetic student messages. There are 36 suspicious, 36 legitimate and 36 ambiguous cases. Topics include placements, internships, scholarships, faculty impersonation, academic portals, campus payments, indirect social engineering, defanged URLs and mixed English/Hinglish. No normalized exact duplicate was found within the holdout or against the 72 semantic references. The holdout was excluded from reference embeddings and threshold decisions. Baseline predictions were captured before scoring changes and opened after the changes were fixed. Separate development examples motivated the contextual rules. This evaluation had one author and no independent label review or real-world prevalence sample.

Binary metrics use the 72 labeled cases. A hybrid or rule score of at least 40 flags a message. Rules-only excludes URL and ML inputs while applying the original rule weighting and warning-sign floor. Semantic-only flags a positive suspicious-versus-legitimate cosine margin when the model's existing weak-evidence check passes. Uncertain labeled cases count as flags only when the same mode's positive decision applies. Ambiguous cases are reported separately. A flag describes warning signs and never establishes fraud.

| Mode | TP | FP | FN | TN | Precision | Recall | F1 | False-positive rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Original rules only | 20 | 2 | 16 | 34 | 90.9% | 55.6% | 69.0% | 5.6% |
| Semantic only | 22 | 8 | 14 | 28 | 73.3% | 61.1% | 66.7% | 22.2% |
| Original hybrid | 20 | 2 | 16 | 34 | 90.9% | 55.6% | 69.0% | 5.6% |
| Updated hybrid | 26 | 2 | 10 | 34 | 92.9% | 72.2% | 81.3% | 5.6% |
| Updated rules + URL structure | 26 | 2 | 10 | 34 | 92.9% | 72.2% | 81.3% | 5.6% |

The updated hybrid and its rules-plus-URLs comparison flagged the same cases. Genuine MiniLM inference changed scores and supplied nearest-example evidence, but did not improve the binary decisions on this set. Semantic-only flagged four suspicious cases the updated hybrid missed, including the numeric-IP portal and a UPI collect request framed as a fee reversal. Semantic-only also produced six additional false positives in aggregate. Both hybrids flagged five ambiguous cases and surfaced uncertainty on all 36. Semantic-only flagged 14 ambiguous cases and marked 16 uncertain.

The six newly flagged suspicious examples involved an offer gated by a bond, requests for gift-card redemption codes and requests for copies of authentication codes. Both hybrids still falsely flagged a free placement-training update and a paid conference announcement. Remaining false negatives included an indirect request for six digits, a changed payment destination and a request to buy a training kit. These are observations for a future development set. No tuning followed the held-out comparison.

The engine still combines normalized rules, lexical URL findings and a cosine comparison against authored references. The changes add evidence-bound requests for codes, voucher value and conditional payments. Defanged links and misleading text before the actual host are inspected locally. The hybrid preserves the elevated decision when rules and links alone reach it, while the existing strong-rule floor and classification thresholds remain in use. The uncertainty panel explains which evidence was absent, weak or contradictory. Safety wording is identified as a contextual cue, and recommended verification and recovery steps remain available. No probability calibration or sender authentication was performed.

Run `node scripts/compare-detection.mjs` to reproduce the comparison using the frozen baseline. `heldout-student-messages.tsv`, `detection-baseline.json` and `detection-comparison.json` contain the corpus, baseline flags and per-case outcomes. The evaluator checks the holdout hash against the captured baseline.

## Browser performance

Timings are Windows/Edge wall-clock observations in milliseconds from first navigation into the analyzer until ready and from clicks until the corresponding UI result appeared. Model startup includes WASM, model assets and reference embeddings. The baseline browser runs overlapped and the final runs were sequential, so differences are directional observations and do not estimate a controlled speedup.

| Measurement | Dev before | Dev after | Preview before | Preview after |
|---|---:|---:|---:|---:|
| Cold analyzer startup | 7,731 | 6,897 | 11,208 | 8,318 |
| First message | 170 | 196 | 215 | 171 |
| Subsequent distinct message | 187 | 175 | 180 | 136 |
| Same message repeated | — | 100 | — | 78 |
| First OCR scan | 2,962 | 1,712 | 2,276 | 1,712 |
| Second OCR scan in the same section | — | 912 | — | 402 |

The model and completed reference vectors already persisted during ordinary navigation. Concurrent preparation now shares the same promise and the last completed semantic comparison is reused for identical normalized input. Memory holds one completed comparison and active requests for the current app instance. OCR retains one worker while the scanner is mounted, avoiding a new worker and language-data load on the next scan. OCR exits cannot overwrite a replacement file or a manual edit made during extraction. The worker is released when leaving the scanner.

Transformers.js percentage tracking initiated extra local file requests. An intermediate browser trace counted two ONNX GET responses during one model session. The final session counted one in both Vite modes, with no additional ONNX request when returning from the scanner. The indeterminate indicator keeps the loading state visible and removes file-progress state updates. The assessment panel also skips re-rendering when its result and compact-mode props are unchanged. Browser long-task observation recorded a maximum of 115 ms in dev and 104 ms in preview across each desktop flow. This workflow still has main-thread stalls. Edge reported 64 MiB JS heap in dev and 55 MiB in preview at the end of the desktop flows. Browser JS heap excludes native and WASM allocations.

A focused check of the development React component tree confirmed that the assessment subtree was reused after six keystrokes in the analyzer input with results still visible. No before-and-after React commit count was collected.

Vite's transform path reproduced `ERR_LOAD_PUBLIC_URL` for `/ort/ort-wasm-simd-threaded.mjs?import`. In the final app the ONNX Runtime URLs are resolved against the absolute Vite base URL and fetched as static assets. Both runtime files returned HTTP 200 and real browser inference passed in dev and production preview. The baseline browser flow also passed on this machine, so the earlier interactive failure was reproduced at the Vite transform boundary rather than as a baseline browser startup failure.

The browser and OCR verification scripts use the checked-in screenshot fixture. On Windows the browser check defaults to installed Edge. Run `npm.cmd run dev` or `npm.cmd run preview` in one terminal, set `BASE_URL` to the preview address when needed, and run `npm.cmd run browser:check` in another. `BROWSER_OUTPUT` selects an output directory and `BROWSER_SCREENSHOTS=0` writes the JSON report without capturing screenshots. The adjacent `browser-baseline-*` and `browser-final-*` directories contain the measured runs.

## Node inference, batching and memory

The Node benchmark used Windows, Node v24.11.0, the vendored quantized model and the native CPU backend. `node scripts/benchmark-performance.mjs` measures each stage using `performance.now()` and captures process RSS after each operation. Each pipeline measurement starts with a fresh Node process and includes the Transformers.js import. Filesystem caches and processor load were uncontrolled. Times are milliseconds.

| Measurement | Before | After |
|---|---:|---:|
| Cold pipeline initialization | 1,555 | 777 |
| 72 reference embeddings | 629 | 523 |
| First end-to-end message | 123 | 35 |
| Distinct warm messages | 6–10 | 5–15, median 6.9 |
| Warm embedding alone | — | median 5.5 |
| Identical repeated analysis | — | median 0.20 |
| OCR worker initialization | 1,090 | 672 |
| First OCR recognition | 328 | 341 |
| Repeated OCR recognition, reusing worker | 226–254 | 215–231 |

In the final run, warm inference on the 72 references took 499 ms as one batch versus 565 ms for 72 individual calls. The production path retains the existing batch and prepares it once. In that run the batch was faster, with process RSS of 243 MiB after the batch and 186 MiB after the preceding sequential pass. RSS was 37 MiB before loading, 126 MiB after initializing the pipeline, 183 MiB after reference preparation and 180 MiB after warm analysis. The original run was 42, 131, 190 and 191 MiB respectively. The final combined benchmark reached 377 MiB during OCR after a forced extra reference batch, compared with 355 MiB in the original run without that extra batch. These measurements do not isolate an OCR memory delta. OCR worker reuse trades retained memory in the active screen for faster subsequent scans.

Verification passed with 42 automated tests, native pretrained inference, native OCR, real Windows Edge checks in both Vite modes and the production build. The build still reports a chunk-size warning for the Transformers.js bundle.
