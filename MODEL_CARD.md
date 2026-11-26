# Model card — semantic similarity component

## Model details

- **Identifier used:** `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`.
- **Underlying model:** `sentence-transformers/all-MiniLM-L6-v2` (BERT-base architecture, 6 transformer layers, 384-dimensional output), released under **Apache-2.0**.
- **Distribution verified:** Hugging Face metadata lists Apache-2.0, `config.json`, tokenizer files and `onnx/model_quantized.onnx` (~22 MB). The quantized ONNX conversion is used with `dtype: q8` and `device: wasm` in browsers; the same file runs on the native CPU backend in the Node verification script.
- **Runtime:** `@huggingface/transformers` 4.3.2, ONNX Runtime Web 1.31.0-dev binaries vendored under `public/ort`.

## Intended use

Convert a short message into a semantic embedding, then compute cosine similarity against 36 independently authored suspicious and 36 authored legitimate student reference messages. The resulting margin is **one heuristic signal** in a transparent warning-sign score. It was chosen over larger classifiers because it is small, fast, Apache-2.0, browser-compatible and adequate for semantic similarity on an 8 GB laptop.

## Not intended use

This is **not** a pretrained fraud classifier, not fine-tuned on fraud data, and not a calibrated risk model. It must not be used alone to approve or reject a transaction, and it is not a production fraud-detection benchmark. The reference examples are authored campus illustrations, not real incident reports, and are kept separate from the 20 evaluation messages.

## How inference works

1. Text is tokenised with the bundled tokenizer.
2. The quantized ONNX graph produces token embeddings; the pipeline applies mean pooling and L2 normalisation.
3. Cosine similarity is computed against precomputed reference embeddings.
4. Mean similarity to the top three suspicious examples minus mean similarity to the top three legitimate examples forms a margin.
5. Margin is mapped to 0–100 and multiplied by a reliability factor based on the closest absolute similarity. Weak evidence contributes zero.

## Performance evidence

`npm run test:model` loads the real model, checks the 384-dimensional output shape and runs two real messages through the full scoring path. Recorded output: 384 dimensions, ~0.7 s for load + three inferences in Node, scam similarity margin +0.148 with semantic contribution enabled, legitimate margin −0.089. Browser loading and inference were verified separately in Chromium (`evidence/browser-results.json`). See `EVALUATION.md` for the small message-set evaluation and its limitations.

## Limitations and risks

- Embeddings encode topic and phrasing, not truth or intent. Well-written legitimate messages can resemble scams and vice versa.
- The reference set is small, English-centric and authored by the same team that wrote the rules; it contains genuine campus notices with fees, deadlines and internships as hard negatives.
- Quantized inference can differ slightly from the full-precision model.
- Model files are served from the same origin; if they are missing or a browser lacks required WASM features, the app falls back to rules and says so.

## License and attribution

Apache License 2.0. Source model: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2. ONNX conversion used: https://huggingface.co/Xenova/all-MiniLM-L6-v2. No model weights were trained or modified for this project.
