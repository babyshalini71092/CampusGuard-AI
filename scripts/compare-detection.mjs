import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyzeMessage } from '../src/engine/analysis.js';
import { createEmbedder } from '../src/engine/embeddings.js';
import { REFERENCE_MESSAGES } from '../src/engine/references.js';
import { detectRules } from '../src/engine/rules.js';
import { createSemanticAnalyzer } from '../src/engine/semantic.js';
import { normalizeText } from '../src/engine/validate.js';

const evidence = new URL('../evidence/', import.meta.url);
const corpus = await readFile(new URL('heldout-student-messages.tsv', evidence), 'utf8');
const datasetHash = createHash('sha256').update(corpus.replace(/\r\n/g, '\n')).digest('hex');
const samples = corpus.trim().split(/\r?\n/).map((line, index) => {
  const [label, topic, text] = line.split('\t');
  return { id: index + 1, label, topic, text };
});
const normalize = (text) => normalizeText(text).toLowerCase();
const references = new Set(REFERENCE_MESSAGES.map(({ text }) => normalize(text)));
const unique = new Set(samples.map(({ text }) => normalize(text)));
if (samples.length < 100 || unique.size !== samples.length || [...unique].some((text) => references.has(text))) {
  throw new Error('Expected at least 100 unique holdout messages with no exact reference overlap.');
}

const embedder = createEmbedder({ modelPath: fileURLToPath(new URL('../public/models/minilm', import.meta.url)) });
const semantic = createSemanticAnalyzer(embedder);
if (!await semantic.prepare()) throw new Error(embedder.getState().error || 'Model preparation failed.');

const baseline = process.argv.includes('--capture-baseline');
const baselineUrl = new URL('detection-baseline.json', evidence);
if (baseline) {
  const cases = [];
  for (const sample of samples) {
    const rules = detectRules(normalizeText(sample.text));
    const hybrid = await analyzeMessage(sample.text, { semantic });
    if (!hybrid.semantic) throw new Error(`Inference failed on case ${sample.id}`);
    const score = Math.max(Math.round(rules.score * 0.75), rules.indicators.some(({ weight }) => weight >= 27) ? 45 : 0);
    const { weakEvidence, gap } = hybrid.semantic;
    cases.push({ id: sample.id,
      rules: { score, flagged: score >= 40, uncertain: rules.indicators.length === 0 || (score >= 15 && score <= 65) },
      semantic: { gap, flagged: !weakEvidence && gap > 0, uncertain: weakEvidence },
      existing: { score: hybrid.score, flagged: hybrid.score >= 40, uncertain: hybrid.uncertain },
    });
  }
  await writeFile(baselineUrl, JSON.stringify({ datasetHash, cases }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Captured baseline for ${cases.length} cases. Results are withheld until comparison.`);
} else {
  const prior = JSON.parse(await readFile(baselineUrl, 'utf8'));
  if (prior.datasetHash !== datasetHash || prior.cases.length !== samples.length) throw new Error('Holdout changed after baseline capture.');
  const rows = [];
  for (const sample of samples) {
    const improved = await analyzeMessage(sample.text, { semantic });
    const deterministic = await analyzeMessage(sample.text);
    if (!improved.semantic) throw new Error(`Inference failed on case ${sample.id}`);
    rows.push({ ...sample, ...prior.cases[sample.id - 1], improved: {
      score: improved.score, flagged: improved.score >= 40, uncertain: improved.uncertain,
    }, improvedRulesAndUrls: {
      score: deterministic.score, flagged: deterministic.score >= 40, uncertain: deterministic.uncertain,
    } });
  }
  const metrics = Object.fromEntries(['rules', 'semantic', 'existing', 'improved', 'improvedRulesAndUrls'].map((mode) => {
    const count = (label, flagged) => rows.filter((row) => row.label === label && row[mode].flagged === flagged).length;
    const tp = count('suspicious', true), fp = count('legitimate', true);
    const fn = count('suspicious', false), tn = count('legitimate', false);
    const percent = (numerator, denominator) => Number((100 * numerator / (denominator || 1)).toFixed(1));
    return [mode, { tp, fp, fn, tn, precision: percent(tp, tp + fp), recall: percent(tp, tp + fn),
      f1: percent(2 * tp, 2 * tp + fp + fn), falsePositiveRate: percent(fp, fp + tn),
      ambiguousFlagged: count('ambiguous', true), ambiguousUncertain: rows.filter((row) => row.label === 'ambiguous' && row[mode].uncertain).length,
    }];
  }));
  await writeFile(new URL('detection-comparison.json', evidence), JSON.stringify({ datasetHash, metrics, rows }, null, 2) + '\n');
  console.table(metrics);
}
