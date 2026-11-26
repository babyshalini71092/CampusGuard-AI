/**
 * Diagnostic record for the local ONNX model lifecycle in both dev and
 * production preview. The analyzer now initializes the model when opened;
 * this script records that transition and the explicit manual retry control.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const report = [];
const targets = [
  { name: 'dev', url: 'http://127.0.0.1:5173' },
  { name: 'production', url: 'http://127.0.0.1:4173' },
];

for (const target of targets) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const requests = [];
  const errors = [];
  page.on('request', (r) => {
    if (/\/(models|ort)\//.test(r.url())) requests.push(`REQ ${r.method()} ${r.url().replace(target.url, '')}`);
  });
  page.on('response', (r) => {
    if (/\/(models|ort)\//.test(r.url())) requests.push(`RES ${r.status()} ${r.url().replace(target.url, '')}`);
  });
  page.on('requestfailed', (r) => {
    const error = r.failure()?.errorText || '';
    if (!/\/(models|ort)\//.test(r.url()) || !/ERR_ABORTED|ERR_CACHE_WRITE_FAILURE/.test(error)) {
      errors.push(`FAILED ${r.url()} ${error}`);
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_ABORTED|ERR_CACHE_WRITE_FAILURE/.test(m.text())) errors.push(m.text().slice(0, 250));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 250)}`));

  await page.goto(target.url, { waitUntil: 'networkidle' });
  const initialPill = await page.locator('.model-pill').innerText();
  await page.getByRole('button', { name: 'Scam Analyzer', exact: true }).click();
  const panelOnOpen = (await page.locator('.model-panel').innerText()).replace(/\n+/g, ' | ');
  let loadOutcome = 'timeout';
  try {
    await page.getByRole('button', { name: 'Initialized' }).waitFor({ timeout: 180000 });
    loadOutcome = 'ready';
  } catch {
    loadOutcome = (await page.locator('.model-panel').innerText()).replace(/\n+/g, ' | ');
  }

  let afterMeta = '(not analyzed)';
  if (loadOutcome === 'ready') {
    await page.locator('#message-input').fill('Congratulations! Your internship is confirmed. Pay Rs 1,500 registration fee today to receive the offer letter.');
    await page.getByRole('button', { name: 'Analyze message' }).click();
    await page.getByText('Detected suspicious phrases').waitFor({ timeout: 60000 });
    afterMeta = (await page.locator('.result-meta').innerText()).replace(/\n+/g, ' | ');
  }

  const entry = {
    target: target.name,
    initialPill,
    panelOnOpen,
    loadOutcome,
    afterMeta,
    manualRetryControlPresent: await page.getByRole('button', { name: /Initialized|Retry model|Load model/ }).count() > 0,
    requests: requests.slice(0, 30),
    errors: errors.slice(0, 15),
  };
  report.push(entry);
  console.log(JSON.stringify(entry, null, 2));
  await browser.close();
}

fs.writeFileSync(new URL('../evidence/model-loading-diagnostic.json', import.meta.url), JSON.stringify(report, null, 2));
