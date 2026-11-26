/**
 * Real-model smoke test (not a mock): loads the vendored ONNX model in Node,
 * runs inference on actual messages and checks similarity ordering.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmbedder, cosineSimilarity, MODEL_ID, MODEL_VARIANT } from '../src/engine/embeddings.js';
import { createSemanticAnalyzer } from '../src/engine/semantic.js';
import { analyzeMessage } from '../src/engine/analysis.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelPath = path.join(root, 'public', 'models', 'minilm');
const embedder = createEmbedder({ modelPath });
const started = Date.now();

const ready = await embedder.init();
if (!ready) {
  console.error('MODEL LOAD FAILED:', embedder.getState().error);
  process.exit(1);
}
const vectors = await embedder.embed([
  'You won a lottery. Share your OTP and pay a processing fee now.',
  'Your salary was credited to your account. Reference number SLP-20934.',
  'Meeting at ten tomorrow.',
]);
if (vectors.length !== 3 || vectors[0].length !== 384) {
  console.error('UNEXPECTED EMBEDDING SHAPE', vectors.length, vectors[0]?.length);
  process.exit(1);
}
const scamVsSalary = cosineSimilarity(vectors[0], vectors[1]);
const scamVsMeeting = cosineSimilarity(vectors[0], vectors[2]);
const semantic = createSemanticAnalyzer(embedder);
const scamAssessment = await analyzeMessage('You won a lottery. Share your OTP and pay a processing fee now.', { semantic });
const benignAssessment = await analyzeMessage('Your salary was credited to your account. Reference number SLP-20934.', { semantic });

console.log(JSON.stringify({
  model: MODEL_ID,
  variant: MODEL_VARIANT,
  path: modelPath,
  loadAndInferenceMs: Date.now() - started,
  embeddingDimensions: vectors[0].length,
  cosine: { scamVsSalary: Number(scamVsSalary.toFixed(3)), scamVsMeeting: Number(scamVsMeeting.toFixed(3)) },
  scam: {
    score: scamAssessment.score, level: scamAssessment.level,
    semanticScore: scamAssessment.semantic?.score, margin: scamAssessment.semantic?.gap,
    semanticUsed: scamAssessment.semanticUsed,
    nearestLabel: scamAssessment.semantic?.nearest?.[0]?.label,
  },
  legitimate: {
    score: benignAssessment.score, level: benignAssessment.level,
    semanticScore: benignAssessment.semantic?.score, margin: benignAssessment.semantic?.gap,
    semanticUsed: benignAssessment.semanticUsed,
  },
}, null, 2));

if (!scamAssessment.semanticUsed || scamAssessment.semantic.gap <= 0) {
  console.error('SEMANTIC SIGNAL CHECK FAILED: scam margin was not positive.');
  process.exit(1);
}
console.log('PASS: real pretrained model loaded and semantic similarity contributed to a scam assessment.');
