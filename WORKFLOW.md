# CampusGuard AI workflow

## A. Message analysis

1. Student opens **Scam Analyzer**, pastes an SMS/WhatsApp/email message (up to 4,000 characters), picks a campus example, or receives text from the Screenshot Scanner. Opening the Analyzer starts local model initialization automatically; manual retry stays available.
2. `validateMessage` strips zero-width/control characters, normalises Unicode lookalikes and checks length.
3. `detectRules` matches concrete campus request patterns — internship/placement fees, scholarship charges, college-fee impersonation, faculty impersonation, event registrations, hostel advances, academic-portal logins, deadlines used as pressure and personal-account payment requests. Negated or safety-oriented phrasing suppresses a match; explicit safety language subtracts points.
4. `inspectUrls` extracts URLs and examines host/path strings only (punycode, lookalikes, IP hosts, shorteners, TLD, sensitive path). No DNS lookup or HTTP request is made.
5. If the pretrained model is ready, `createSemanticAnalyzer` embeds the message and compares it with 36 suspicious and 36 legitimate authored student examples (kept in `references.js`, separate from evaluation messages) using cosine similarity. The margin between mean top-3 suspicious and legitimate similarity is mapped to a 0–100 heuristic signal, scaled by a reliability factor derived from the closest match. Inconclusive evidence contributes nothing and is labelled as such.
6. `combineScores` applies effective weights (55/25/20; 75/25 when semantic evidence is absent). A single 27+ point indicator raises very low results to 45.
7. The UI renders concern level, campus category, indicator cards with matched phrases, score breakdown, semantic state and margin, next steps, uncertainty and limitations. A sanitized report can be downloaded; message text is deliberately excluded.

## B. Screenshot analysis

1. Choose or drop a PNG/JPEG/WebP file ≤5 MB. `validateImage` checks type and size.
2. A temporary object URL shows a preview; no upload occurs.
3. Tesseract.js loads the vendored worker/core/English language data and reports progress while recognising text.
4. The extracted text is editable. Failure or poor quality falls back to manual entry.
5. Analysis uses exactly the same engine as the message analyzer; the result can be opened in the full analyzer view.

## C. Student Safety Assessment

1. Student answers eight yes/no questions about verified campus channels, pressure, internship/scholarship/event/advance fees, credentials, guarantees, QR tricks and unexpected contacts. Each question has a `riskyAnswer`; answers update the result immediately.
2. Triggered answers select verification steps, things to avoid and a personal checklist.
3. Tiers: `stop` ≥55, `pause` ≥25, `review` ≥1, `careful` when all answers are safe, `incomplete` otherwise.
4. The UI never asks for credentials or account numbers and never claims that a payment is guaranteed safe.

## D. Recovery Assistant

1. Student selects any combination of six incident types, including whether the request was related to a college activity.
2. `generateRecoveryPlan` filters and orders twelve response steps. Campus cases add the placement cell/training office, college administration/IT helpdesk and the event organiser or warden, to be contacted through independently verified channels.
3. Steps can be checked off in the current tab. The portal link points to the official National Cyber Crime Reporting Portal; the helpline is 1930.
4. The plan states that reporting does not guarantee recovery.

## E. Campus Scam Awareness

1. Five scenarios are selectable: internship fee, scholarship charge, fake faculty request, technical-fest charge and academic-portal phishing. Each offers three responses.
2. Choosing a response reveals whether it is sound/risky/partly useful, why, and a verification technique.
3. Progress counts attempts and sound choices for the current tab only.

## Model states

| State | Meaning | UI behaviour |
|---|---|---|
| not-initialized | No attempt to load yet | “Load model” button available; rules-only analysis works |
| loading | Local ONNX runtime/model files are being prepared | Progress bar; analysis still possible with rules only |
| ready | Pipeline initialized and reference embeddings computed | “Initialized”; semantic inference runs per analysis; the control remains for retry/diagnostics |
| unavailable | Load failed (e.g. unsupported browser or preparation error) | Error shown, retry button, rule-based fallback identified |
| rule-based fallback | Analysis ran without semantic input | Weights redistributed to 75/25 and stated in the result |

A result separately distinguishes **semantic inference executed**, **semantic evidence contributed**, **evidence inconclusive/excluded** and **rule-based fallback**. No hard-coded semantic result is ever displayed.

## Score boundaries

| Score | Concern |
|---|---|
| 0–17 | Few warning signs |
| 18–39 | Moderate |
| 40–69 | Elevated |
| 70–100 | High |
