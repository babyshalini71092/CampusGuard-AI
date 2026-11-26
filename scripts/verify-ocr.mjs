/**
 * Real OCR smoke test: reads the checked-in PNG fixture and runs Tesseract.js
 * against the vendored worker, core and language data (no CDN).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetDir = path.join(root, 'public', 'tesseract');
const image = fs.readFileSync(path.join(root, 'evidence', 'ocr-input.png'));

const { createWorker } = await import('tesseract.js');
const worker = await createWorker('eng', 1, {
  corePath: assetDir,
  langPath: assetDir,
  cacheMethod: 'none',
});
try {
  const { data } = await worker.recognize(image);
  const text = data.text.replace(/\s+/g, ' ').toLowerCase();
  console.log(JSON.stringify({ engine: 'Tesseract.js 5 language data (eng)', extracted: data.text.trim().slice(0, 300), confidence: data.confidence }, null, 2));
  if (!/won|lottery|otp/i.test(text)) {
    console.error('OCR CHECK FAILED: expected keywords were not recognised.');
    throw new Error('OCR verification failed.');
  }
  console.log('PASS: local OCR extracted text from a rendered screenshot.');
} finally {
  await worker.terminate();
}
