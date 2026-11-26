import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyzeMessage } from '../src/engine/analysis.js';
import { createEmbedder } from '../src/engine/embeddings.js';
import { createSemanticAnalyzer } from '../src/engine/semantic.js';
import { REFERENCE_MESSAGES } from '../src/engine/references.js';

const file = (relative) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const round = (value) => Math.round(value * 100) / 100;
const rss = () => round(process.memoryUsage.rss() / 2 ** 20);
const ms = {};
const rssMiB = { initial: rss() };
async function measure(label, run) {
  const started = performance.now();
  const result = await run();
  (ms[label] ??= []).push(round(performance.now() - started));
  rssMiB[label] = rss();
  return result;
}

const embedder = createEmbedder({ modelPath: file('public/models/minilm') });
const semantic = createSemanticAnalyzer(embedder);
if (!await measure('pipeline', () => embedder.init())) throw new Error(embedder.getState().error);
await measure('referenceBatch', () => semantic.prepare());
const messages = [
  'The placement group asks us to buy gift cards and send the codes privately.',
  'Library books may be renewed until Friday.',
  'Final reminder: pay through the official student portal before 5 pm.',
  'Registrar says the portal is down; send the deposit to his personal UPI.',
  'Placement ke liye pehle token dena hai, phir joining letter milega.',
  'IT reminder: never share your OTP or password with anyone.',
  'The scholarship team says to email a photograph of the login code.',
  'The debate club will accept sign-ups at the library desk.',
];
const assessments = [];
for (const [index, message] of messages.entries()) {
  const result = await measure(index ? 'warmAnalysis' : 'firstAnalysis', () => analyzeMessage(message, { semantic }));
  if (!result.semantic) throw new Error(`No semantic result for message ${index + 1}`);
  assessments.push({ message, score: result.score, level: result.level, gap: result.semantic.gap });
}
for (const message of messages) {
  await measure('warmEmbedding', () => embedder.embed(message));
  await analyzeMessage(message, { semantic });
  await measure('repeatAnalysis', () => analyzeMessage(message, { semantic }));
}
const references = REFERENCE_MESSAGES.map(({ text }) => text);
await measure('sequentialReferences', async () => {
  for (const reference of references) await embedder.embed(reference);
});
await measure('warmReferenceBatch', () => embedder.embed(references));

const { createWorker } = await import('tesseract.js');
const image = await readFile(file('evidence/ocr-input.png'));
const asset = file('public/tesseract');
const worker = await measure('ocrWorkerInitialization', () => createWorker('eng', 1, {
  corePath: asset, langPath: asset, cacheMethod: 'none',
}));
try {
  for (let i = 0; i < 3; i += 1) {
    const { data } = await measure(i ? 'repeatOcr' : 'firstOcr', () => worker.recognize(image));
    if (!/lottery/i.test(data.text)) throw new Error('Expected OCR fixture text');
  }
} finally {
  await worker.terminate();
}
console.log(JSON.stringify({ node: process.version, platform: process.platform, references: references.length, ms, rssMiB, assessments }, null, 2));
