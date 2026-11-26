/**
 * Browser acceptance run using real Chromium: navigation, model loading in
 * WASM, analysis, OCR, questionnaires, layout and console-error checks.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const evidence = process.env.BROWSER_OUTPUT || path.join(root, 'evidence');
fs.mkdirSync(evidence, { recursive: true });
const imagePath = path.join(root, 'evidence', 'ocr-input.png');
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const saveScreenshot = (name) => process.env.BROWSER_SCREENSHOTS === '0' ? undefined
  : page.screenshot({ path: path.join(evidence, name), fullPage: true });
await page.addInitScript(() => {
  window.campusLongTasks = [];
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    new PerformanceObserver((list) => {
      window.campusLongTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration })));
    }).observe({ type: 'longtask', buffered: true });
  }
});
const consoleErrors = [];
const assetFetchNoise = [];
const ortResponses = new Set();
let modelDownloads = 0;
page.on('response', (response) => {
  const { pathname } = new URL(response.url());
  if (response.ok() && pathname.startsWith('/ort/')) ortResponses.add(pathname);
  if (response.ok() && pathname.endsWith('/model_quantized.onnx') && response.request().method() === 'GET') modelDownloads += 1;
});
const isLocalAssetNoise = (url, error = '') => /\/(models|ort|tesseract)\//.test(url)
  && /ERR_ABORTED|ERR_CACHE_WRITE_FAILURE/.test(error);
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (/Failed to load resource: net::ERR_(ABORTED|CACHE_WRITE_FAILURE)/.test(m.text())) {
    assetFetchNoise.push(m.text());
  } else consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => {
  const text = `requestfailed: ${r.url()} ${r.failure()?.errorText}`;
  if (isLocalAssetNoise(r.url(), r.failure()?.errorText || '')) assetFetchNoise.push(text);
  else consoleErrors.push(text);
});
const results = {};
let ocrText = '';
const check = (name, value) => { if (!value) process.exitCode = 1; results[name] = value; console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); };

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await saveScreenshot('home-desktop.png');
  check('home renders campus headline and tagline', await page.getByText('Protect your campus journey.', { exact: false }).first().isVisible()
    && await page.getByText('Stay informed. Stay secure. Stay connected.', { exact: false }).first().isVisible());

  // Analyzer + real browser model inference
  let started = performance.now();
  await page.getByRole('button', { name: 'Scam Analyzer', exact: true }).click();
  // Opening the analyzer initializes the local model automatically; a manual
  // retry control remains available if initialization fails.
  await page.getByRole('button', { name: 'Initialized' }).waitFor({ timeout: 180000 });
  await page.getByText('Model initialized. Semantic inference runs on each analysis; its contribution is shown in the result.').isVisible();
  check('pretrained ONNX model initialized in browser', true);
  results.modelStartupMs = Math.round(performance.now() - started);
  // Use a typed message, not one of the predefined sample buttons.
  await page.locator('#message-input').fill('Congratulations! Your internship is confirmed. Pay Rs 1,500 registration fee today to receive the offer letter.');
  started = performance.now();
  await page.getByRole('button', { name: 'Analyze message' }).click();
  await page.getByText('Detected suspicious phrases').waitFor({ timeout: 60000 });
  results.firstAnalysisMs = Math.round(performance.now() - started);
  check('typed campus message analyzed with semantic evidence', await page.getByText('ML evidence used').isVisible());
  check('elevated or high concern for internship fee scam', await page.getByText(/^(High|Elevated) concern$/).first().isVisible());
  // A genuine campus notice must not be flagged just because it mentions a fee.
  await page.locator('#message-input').fill('Placement cell notice: the written test is on Friday at 10 AM in Lab 3. The shortlist is on the official portal. No fee is charged at any stage.');
  started = performance.now();
  await page.getByRole('button', { name: 'Analyze message' }).click();
  await page.getByText('Few warning signs', { exact: true }).waitFor({ timeout: 60000 });
  results.warmAnalysisMs = Math.round(performance.now() - started);
  check('legitimate campus notice shows few warning signs', await page.getByText('Few warning signs', { exact: true }).isVisible());
  started = performance.now();
  await page.getByRole('button', { name: 'Analyze message' }).click();
  await page.getByText('Few warning signs', { exact: true }).waitFor();
  results.repeatAnalysisMs = Math.round(performance.now() - started);
  await saveScreenshot('analyzer-desktop.png');

  // Screenshot OCR
  await page.getByRole('button', { name: 'Screenshot Scanner', exact: true }).click();
  await page.locator('#screenshot-input').setInputFiles(imagePath);
  started = performance.now();
  await page.getByRole('button', { name: 'Extract text' }).click();
  await page.waitForFunction(() => document.querySelector('#ocr-text')?.value.length > 20, null, { timeout: 120000 });
  results.ocrMs = Math.round(performance.now() - started);
  ocrText = await page.locator('#ocr-text').inputValue();
  check('browser OCR extracted message', /won|lottery|otp/i.test(ocrText));
  const extractButton = page.getByRole('button', { name: 'Extract text', exact: true });
  started = performance.now();
  await extractButton.click();
  await extractButton.waitFor({ timeout: 120000 });
  results.repeatOcrMs = Math.round(performance.now() - started);
  const corrected = 'Please share your OTP now and pay a processing fee.';
  await page.locator('#ocr-text').fill(corrected);
  await page.getByRole('button', { name: 'Analyze extracted text' }).click();
  await page.getByText('Recommended next steps').waitFor({ timeout: 60000 });
  check('extracted text analyzed', true);
  await saveScreenshot('screenshot-desktop.png');
  const requestsBeforeReturn = modelDownloads;
  await page.getByRole('button', { name: 'Open full analysis' }).click();
  check('corrected OCR reached the analyzer', await page.locator('#message-input').inputValue() === corrected);
  check('model stays initialized across sections', await page.getByRole('button', { name: 'Initialized', exact: true }).isVisible()
    && modelDownloads === requestsBeforeReturn);
  results.modelDownloads = modelDownloads;
  check('model weights requested once per session', modelDownloads === 1);
  results.ortResponses = [...ortResponses];
  check('vendored ORT module and WASM loaded', results.ortResponses.includes('/ort/ort-wasm-simd-threaded.mjs')
    && results.ortResponses.includes('/ort/ort-wasm-simd-threaded.wasm'));

  // Payment safety
  await page.getByRole('button', { name: 'Student Safety Assessment', exact: true }).click();
  const assessmentAnswers = [
    ['Do you personally know the person or organisation asking for payment?', 'No'],
    ['Have you verified the request through an official campus channel?', 'No'],
    ['Is a registration, processing or advance fee required?', 'Yes'],
    ['Have you been asked for an OTP, UPI PIN, password or CVV?', 'Yes'],
  ];
  for (const [prompt, answer] of assessmentAnswers) {
    const card = page.locator('.question-card').filter({ hasText: prompt }).first();
    await card.getByRole('button', { name: answer, exact: true }).click();
  }
  check('student assessment escalates to stop', await page.getByText('Stop and verify with the campus office').isVisible());
  await saveScreenshot('payment-desktop.png');

  // Recovery
  await page.getByRole('button', { name: 'Recovery Assistant', exact: true }).click();
  const incident = page.locator('.question-card').filter({ hasText: 'Did you transfer money or authorise a payment?' }).first();
  await incident.getByRole('button', { name: 'Yes' }).click();
  check('recovery plan generated', await page.getByText('Contact your bank or payment provider').isVisible());
  await saveScreenshot('recovery-desktop.png');

  // Simulation
  await page.getByRole('button', { name: 'Campus Scam Awareness', exact: true }).click();
  await page.getByRole('tab', { name: /A .professor. needs your details urgently/ }).click();
  await page.getByRole('button', { name: /Call the professor on the number saved by the department/ }).click();
  check('simulation feedback shown', await page.getByText('Sound choice.', { exact: false }).isVisible());

  // Privacy docs links resolve
  await page.getByRole('button', { name: 'Privacy & Method', exact: true }).click();
  const docResponse = await page.request.get(`${base}/docs/README.md`);
  check('documentation files served', docResponse.ok());

  results.mainThread = await page.evaluate(() => ({
    longestTaskMs: Math.max(0, ...window.campusLongTasks.map(({ duration }) => duration)),
    longTasks: window.campusLongTasks.length,
    jsHeapMiB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 2 ** 20) : null,
  }));

  // Mobile layout, overflow and navigation
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await saveScreenshot('home-mobile.png');
  const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(`mobile no horizontal overflow (${overflow.scroll}/${overflow.client})`, overflow.scroll <= overflow.client + 1);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Student Safety Assessment', exact: true }).click();
  check('mobile navigation works', await page.getByText('Check the request before you pay').isVisible());
  const mobileOverflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(`mobile payment no overflow (${mobileOverflow.scroll}/${mobileOverflow.client})`, mobileOverflow.scroll <= mobileOverflow.client + 1);
  await saveScreenshot('payment-mobile.png');

  check('no application console errors (excluding local asset fetch noise)', consoleErrors.length === 0);
} catch (error) {
  process.exitCode = 1;
  results.fatal = String(error);
  console.error('FATAL', error);
} finally {
  results.consoleErrors = consoleErrors;
  results.localAssetFetchNoise = assetFetchNoise;
  results.ocrText = ocrText;
  fs.writeFileSync(path.join(root, 'evidence', 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  await browser.close();
}
