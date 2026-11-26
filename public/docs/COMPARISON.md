# Comparison: CampusGuard AI vs Campus Fraud Shield

The reference repository `hdspandana/Campus-Fraud-Shield` was cloned and its source inspected (not just its README): `app.py` (963 lines, Streamlit), `api.py` (277, FastAPI), `core/pipeline.py` (514), `core/scorer.py` (643), `core/rules_engine.py` (428), `core/ml_model.py` (609), `core/history_engine.py` (681), `core/domain_checker.py` (1,019), `utils/llm_explainer.py` (165), plus 56 test functions and CI configuration.

## What Campus Fraud Shield already does well

- A genuinely hybrid four-engine pipeline: rules, domain checks, a sentence-transformer + logistic-regression classifier, and a FAISS history of reported scams, with published weights and conflict escalation.
- Broad, carefully maintained rule sets including Hinglish patterns, homoglyph handling and documented false-positive fixes.
- Optional VirusTotal and Google Safe Browsing integrations with fail-open behaviour; optional Gemini explanation grounded in retrieved examples.
- Two interfaces (Streamlit UI and FastAPI) sharing one pipeline, dependency injection, structured logging, honest cross-validated metrics (~76% on a small, partly unattributed dataset) and a large pytest suite.

These are real strengths; CampusGuard AI deliberately does not try to duplicate the threat-intel or reporting-history machinery.

## Differences

| Dimension | Campus Fraud Shield | CampusGuard AI |
|---|---|---|
| Primary architecture | Python backend: Streamlit + FastAPI, pandas/scikit-learn/FAISS, optional Docker; model trained locally with ~66–86 labelled rows | Browser-only React/Vite SPA; pure JS engine modules; static ONNX model and WASM/OCR assets; no backend or database |
| ML role | Fine-tuned logistic-regression classifier on sentence embeddings (45% engine weight), plus FAISS retrieval | Pretrained MiniLM embeddings only, used as a similarity signal (0–20% effective weight). Explicitly not a classifier |
| Privacy | Messages can be sent to Streamlit/FastAPI; optional threat-intel and Gemini calls leave the machine; history is stored locally and searched | Message text, screenshots and answers never leave the browser tab; remote model downloads and arbitrary URL visits are disabled |
| Prevention before payment | Not a dedicated flow; action advice is generated after a message scan | Dedicated Student Safety Assessment with eight campus questions, tiered recommendation, verification steps and avoid-list |
| Post-incident response | Action advisor/helplines in scan output | Dedicated recovery workflow with five incident questions, prioritised checklist, completion state and official reporting link |
| Learning | Documentation and demo messages | Five campus scenarios with choice explanations and a verification technique each |
| Screenshots | Not supported | Local OCR, preview, progress, editable text and manual fallback |
| Explainability | Engine breakdown, reasons, formula, LLM explanation and retrieved similar cases | Matched phrases with explanations, effective weights and contributions, semantic margin, strong-indicator floor, uncertainty flags; no generative layer |
| Link analysis | Domain checker, typosquatting, trusted/reported domain lists, optional external reputation APIs | Lexical-only inspection of host/path strings; never visits a link; no reputation API |
| Deployment footprint | Python environment with heavier ML/data dependencies; 8 GB laptop needs care with training stack | `npm ci && npm run dev`; model 22 MB, ORT WASM 14 MB, OCR assets 31 MB; no training step |
| Testing | 56 pytest functions, CI, cross-validation and ablations | 40 Vitest unit/integration tests, real-model and real-OCR scripts, Playwright desktop/mobile browser run, 20-message demonstration evaluation |

## Meaningful user value added

1. **A decision point before payment** rather than only a message verdict: the student questionnaire converts abstract advice into a personal checklist.
2. **Recovery path for people who already paid**, with evidence preservation and official India reporting details.
3. **Privacy by architecture**: no server-side message handling means the tool can be used with sensitive text without creating a new data store.
4. **Visible uncertainty**: mixed or semantic-weak results are flagged; scores are never presented as probabilities and low scores never mean "safe".
5. **Practice before pressure**: scenario training teaches verification techniques that generalise beyond the sample messages.

## What was intentionally not copied

FAISS history, VirusTotal/Safe Browsing keys, Gemini explanations, a trained classifier, campus-specific entity lists and Docker/Streamlit deployment. Some of these add real detection power; omitting them is a privacy/simplicity trade-off, not a claim that they are inferior. The largest technical gap is the absence of a validated classifier and real-world labelled data; that is the recommended next investment if this product were to be hardened for production.
