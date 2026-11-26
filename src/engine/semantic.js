/** Similarity against an authored reference set — not a trained classifier. */
import { REFERENCE_MESSAGES } from './references.js';
import { cosineSimilarity } from './embeddings.js';
import { clamp } from './validate.js';

export function createSemanticAnalyzer(embedder, references = REFERENCE_MESSAGES) {
  let referenceVectors = null;
  let preparation = null;
  let lastAnalysis = null;
  const pending = new Map();

  async function prepare() {
    if (referenceVectors) return true;
    preparation ??= (async () => {
      if (!await embedder.init()) return false;
      referenceVectors = await embedder.embed(references.map((r) => r.text));
      return true;
    })().finally(() => { preparation = null; });
    return preparation;
  }

  function analyze(text) {
    if (pending.has(text)) return pending.get(text);
    if (lastAnalysis?.text === text) return Promise.resolve(lastAnalysis.result);
    const job = compare(text).then((result) => {
      if (result) lastAnalysis = { text, result };
      return result;
    }).finally(() => pending.delete(text));
    pending.set(text, job);
    return job;
  }

  async function compare(text) {
    const prepared = await prepare();
    if (!prepared) return null;
    const [vector] = await embedder.embed([text]);
    const scored = references.map((ref, index) => ({
      ...ref,
      similarity: cosineSimilarity(vector, referenceVectors[index]),
    }));
    const top = (label, n = 3) => scored.filter((r) => r.label === label)
      .sort((a, b) => b.similarity - a.similarity).slice(0, n);
    const suspiciousTop = top('suspicious');
    const legitimateTop = top('legitimate');
    const mean = (items) => items.reduce((sum, r) => sum + r.similarity, 0) / Math.max(1, items.length);
    const suspiciousMean = mean(suspiciousTop);
    const legitimateMean = mean(legitimateTop);
    const gap = suspiciousMean - legitimateMean;
    const maxSimilarity = Math.max(...scored.map((r) => r.similarity));
    const reliability = clamp((maxSimilarity - 0.3) / 0.2, 0, 1);

    // Map the similarity margin into a 0-100 *heuristic signal*, never a probability.
    const score = clamp(Math.round(((gap + 0.05) / 0.23) * 100), 0, 100);
    const nearest = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
    const [best] = nearest;
    return {
      score,
      gap: Number(gap.toFixed(3)),
      maxSimilarity: Number(maxSimilarity.toFixed(3)),
      suspiciousMean: Number(suspiciousMean.toFixed(3)),
      legitimateMean: Number(legitimateMean.toFixed(3)),
      reliability: Number(reliability.toFixed(2)),
      nearest: nearest.map((r) => ({ label: r.label, category: r.category, text: r.text, similarity: Number(r.similarity.toFixed(3)) })),
      suggestedCategory: gap > 0.03 && best.label === 'suspicious' ? best.category : null,
      weakEvidence: maxSimilarity < 0.35 || Math.abs(gap) < 0.04,
    };
  }

  return { prepare, analyze };
}
