# CampusGuard AI — AI-Powered Student Scam Detection and Campus Safety Assistant

**Stay informed. Stay secure. Stay connected.**

CampusGuard AI is a browser-first student digital-safety tool. It helps a college student check a suspicious internship message, scholarship SMS, placement alert, fake faculty request, event charge or academic-portal login before replying, paying or sharing anything. It also offers a screenshot scanner, a pre-payment safety questionnaire, a post-incident recovery checklist and short campus-scam practice scenarios.

Analysis, local OCR, semantic inference and questionnaire logic run in the browser tab. There is no analysis server, account, message database or API key.

> Educational decision-support tool. It does not detect scams with certainty, cannot verify a person or organisation, and cannot guarantee that a transaction or recovery will succeed.

---

## 1. Problem statement

Students receive convincing requests by SMS, WhatsApp, email and social media: “refundable” internship fees, scholarship processing charges, placement offers, hostel advances, technical-fest registrations, college-fee impersonation and academic-portal phishing. Static advice is easy to agree with and hard to apply under pressure.

CampusGuard AI covers the whole decision: **before** (message and screenshot checks, student safety assessment), **during** (independent-verification checklists) and **after** (recovery assistant). It is designed around campus situations, not generic bank-fraud wording.

## 2. Features implemented

- **Scam Analyzer** — hybrid assessment combining 28 independently written indicator rules and 8 safety-language signals, contextual negation handling, URL *lexical* inspection and genuine pretrained semantic embeddings against 36 suspicious and 36 legitimate authored student references. It clearly separates initialized, inferred, evidence-contributed, inconclusive and rule-only states.
- **Explainable warning-sign result** — 0–100 score, concern level, possible campus category, matched phrases with reasons, effective weights and contributions, semantic comparison figures, next steps, explicit uncertainty and limitations. The score is never presented as a calibrated probability and a low score never declares a message safe.
- **Screenshot Scanner** — local Tesseract.js OCR with bundled worker/core/English data, validation, preview, progress, editable extracted text, failure states, manual fallback and analysis of corrected text.
- **Student Safety Assessment** — eight live questions about internships, scholarships, placements, events, hostel payments, pressure, credentials and unexpected channels. Produces an escalating recommendation, warning signs, verification steps, things to avoid and a personal checklist.
- **Recovery Assistant** — six incident questions generate a prioritised checklist covering the bank/payment provider, evidence preservation, official reporting, credential/device security, account review and campus contacts (placement cell, college administration/IT helpdesk, event organiser or warden). Includes India's National Cyber Crime Reporting Portal and helpline 1930, verified from the official portal. Steps can be marked complete.
- **Campus Scam Awareness** — five realistic practice scenarios (internship, scholarship, fake faculty message, technical fest and portal phishing) with response feedback and a verification technique for each.
- **Sanitized downloadable report** — records score, category, semantic state, indicators, link findings and next steps; deliberately excludes the message text.

## 3. Architecture

```
Browser (React + Vite)
 ├─ sections/        Overview · Analyzer · Screenshot · Student Safety Assessment · Recovery · Awareness · Method
 ├─ useAnalysisEngine.js   explicit model lifecycle (not-initialized/loading/ready/unavailable)
 └─ engine/          pure, unit-testable logic
     ├─ validate.js         normalization, length/file validation, escaping
     ├─ rules.js            28 indicator groups + 8 safety-language signals
     ├─ urlInspection.js    lexical-only URL parsing (never fetches)
     ├─ references.js       36 suspicious + 36 legitimate authored student examples
     ├─ embeddings.js       Transformers.js pipeline, explicit states, cosine similarity
     ├─ semantic.js         mean-pooled embeddings → cosine similarity → heuristic signal
     ├─ analysis.js         weighted aggregation, strong-indicator floor, explanation assembly
     ├─ payment.js          Student Safety Assessment logic
     ├─ recovery.js         campus-aware incident-response plan
     └─ simulation.js       five campus scenarios and feedback

Static assets (served by Vite, no runtime CDN)
 ├─ public/models/minilm/   Apache-2.0 quantized all-MiniLM-L6-v2 ONNX + tokenizer
 ├─ public/ort/             ONNX Runtime WASM binary + loader
 └─ public/tesseract/       Tesseract worker, WASM cores, eng.traineddata.gz
```

The authored semantic reference dataset in `references.js` is separate from the 20 messages in `scripts/evaluate.mjs`. Legitimate references include hard negatives that mention payments, internships, placements and deadlines so those words alone do not create suspicion.

**Score formula:** `warning score = rules × effectiveWeight + link findings × effectiveWeight + semantic × effectiveWeight`, capped at 0–100. Default weights are 55% / 25% / 20%. If the model is unavailable or its similarity evidence is inconclusive, its weight is removed and the remaining weights become 75% / 25%; the UI states this. A single indicator worth 27+ points raises a very low result to a minimum of 45 (“elevated”), and the UI shows when that floor is applied. Concern bands: `<18` few warning signs, `18–39` moderate, `40–69` elevated, `70+` high. Ambiguous, low-signal or mixed-evidence results are labelled uncertain.

## 4. Model states (honest ML reporting)

| State | What it means | What the app shows |
|---|---|---|
| `not-initialized` | No load attempted yet | “Load model” action is available |
| `loading` | Local ONNX files/runtime are being prepared | Progress label and disabled control |
| `ready` | Real local MiniLM inference is available | “Initialized”; the manual retry control remains visible for diagnostics |
| `unavailable` | Loading failed; no semantic evidence can be produced | Error text, “Retry model”, explicit rule-based mode |

When opening the Scam Analyzer, the app starts initialization automatically. Analysis remains available with rules only. A result reports **ML evidence used**, **ML inconclusive**, or **Rules only** according to what actually happened. The report includes separate fields for semantic inference execution, evidence contribution and assessment mode. No result is hard-coded to pretend the model ran.

## 5. Technology stack

| Layer | Choice | Reason |
|---|---|---|
| UI | React 18 + Vite 6, plain CSS, Lucide icons | Small dependency surface, fast on an ordinary laptop |
| ML | `@huggingface/transformers` 4.3.2 with `Xenova/all-MiniLM-L6-v2` quantized ONNX | Genuine pretrained inference, ~22 MB model, Apache-2.0 |
| Runtime | ONNX Runtime Web WASM (vendored) | No server and no CDN at runtime |
| OCR | `tesseract.js` 7 (vendored worker/core/English data) | Local OCR with progress and editable output |
| Tests | Vitest + Testing Library + Playwright | Unit, integration, real-model, real-OCR and browser checks |

No database, authentication, payment integration, custom training, Docker or external API keys.

## 6. Installation and exact commands

Requirements: Node.js 20+ and npm 10+. Python 3 with Pillow is used only by the verification scripts that generate a test image.

```bash
cd ~/fraudfirewall
npm ci                  # install from package-lock.json (or: npm install)
npm run dev             # http://localhost:5173  (binds 0.0.0.0)
```

Open `http://localhost:5173`. The topbar begins at **ML off**; opening the Scam Analyzer starts local model initialization, after which the pill reads **ML ready**. If loading fails, the pill reads **Rules only** and the analyzer offers **Retry model**.

Production build:

```bash
npm run build
npm run preview         # http://localhost:4173
```

Tests:

```bash
npm test                # 40 unit + integration tests (Vitest)
npm run test:model      # real ONNX model load + inference in Node
npm run test:ocr        # real Tesseract.js OCR on a generated screenshot
npm run test:eval       # 20 student-message demonstration evaluation
npm run verify          # unit, model, OCR and production build
node scripts/browser-check.mjs   # Playwright acceptance run (dev server must be running)
# BASE_URL=http://localhost:4173 node scripts/browser-check.mjs  # against production preview
```

The Playwright run writes screenshots and `browser-results.json` into `evidence/`.

## 7. Model loading requirements

- Model: `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`, Apache-2.0.
- File: `public/models/minilm/onnx/model_quantized.onnx` plus `config.json`, `tokenizer.json`, `tokenizer_config.json`, `special_tokens_map.json`.
- Browser: sets `env.allowLocalModels = true`, `env.allowRemoteModels = false` and local ONNX Runtime WASM paths before creating the pipeline. Device is `wasm`, dtype `q8`.
- Node verification: the identical ONNX file runs on the native `cpu` device.
- The model is an embedding model, **not** a fraud classifier and not fine-tuned. See `MODEL_CARD.md`.

## 8. Privacy considerations

Text, screenshots and questionnaire answers stay in the browser tab. No application server receives them. URLs in messages are parsed as strings and never opened. No OTPs, UPI PINs, passwords, card numbers or account numbers are requested. Nothing is stored in localStorage or a history database; closing the tab ends the session. Static assets may be cached by the browser. Do not paste real credentials into any analysis tool. See `SECURITY.md`.

## 9. Known limitations

- The reference and evaluation messages are small, authored student scenarios, not a representative corpus of real incidents.
- Rules can miss novel wording and can flag legitimate messages that resemble scams. Languages other than English with a few Hinglish-style phrases are not covered.
- Semantic similarity is influenced by topic, not intent; a genuine campus notice can resemble a suspicious one, and a novel scam can look ordinary.
- Link inspection is lexical only: it cannot know whether a domain is malicious.
- OCR is English-only and needs reasonably sharp printed text.
- Recovery guidance is general information, not legal or financial advice. Reporting does not guarantee money recovery.
- Browser testing used headless Chromium only; Safari, Firefox and older WASM implementations were not tested.
- Full offline/PWA operation is not implemented; runtime assets are local, but the app must first be served by the dev/preview server.

See `EVALUATION.md` for measured results and `COMPARISON.md` for the differences from Campus Fraud Shield.
