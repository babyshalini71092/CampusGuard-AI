/**
 * Lexical URL inspection ONLY. Never visits, resolves or fetches a URL.
 * Findings are heuristic indicators, not reputation or safety verdicts.
 */
import { clamp } from './validate.js';

const URL_RE = /(?:(?:h(?:tt|xx)ps?:\/\/)|(?:www\.))[^\s<>"'`\u0000-\u001f]+/gi;
const BARE_DOMAIN_RE = /(?:^|[\s(])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|in|co|io|info|biz|xyz|top|click|loan|tk|ml|ga|cf|gq|online|site))\b/gi;
const RISKY_TLDS = new Set(['tk', 'ml', 'ga', 'cf', 'gq', 'top', 'click', 'loan', 'work', 'party', 'xyz', 'su']);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'ow.ly', 'buff.ly']);
const BRANDS = ['statebankofindia', 'hdfcbank', 'icicibank', 'axisbank', 'kotak', 'sbi', 'rbi', 'paytm', 'phonepe', 'googlepay', 'amazon', 'flipkart', 'cybercrime', 'indiapost', 'upi'];

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

export function extractUrls(text) {
  if (typeof text !== 'string') return [];
  const found = [];
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0].replace(/[.,;:!?)\]}]+$/g, '');
    if (!found.includes(raw)) found.push(raw);
  }
  for (const match of text.matchAll(BARE_DOMAIN_RE)) {
    const raw = match[1];
    if (!found.some((u) => u.toLowerCase().includes(raw.toLowerCase()))) found.push(raw);
  }
  return found.slice(0, 10);
}

function parseUrl(raw) {
  const decoded = raw.replace(/^hxxp/i, 'http').replaceAll('[.]', '.');
  const candidate = /^https?:\/\//i.test(decoded) ? decoded : `https://${decoded}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/** Inspect one URL's textual structure. No DNS lookup, no HTTP request. */
export function inspectUrl(raw) {
  const url = parseUrl(raw);
  if (!url) {
    return { url: raw, score: 18, findings: [{ label: 'Malformed URL', detail: 'The link is not a valid web address; treat it as untrustworthy.' }] };
  }
  const host = url.hostname.toLowerCase();
  const labels = host.split('.');
  const registered = labels.length >= 2 ? labels[labels.length - 2] : host;
  const findings = [];
  let score = 0;
  const add = (points, label, detail) => {
    score += points;
    findings.push({ label, detail });
  };

  if (url.username || url.password) add(28, 'Text before the actual host', 'A link can show a familiar name before @ while sending you to the host that follows it.');
  if (/^hxxp/i.test(raw) || raw.includes('[.]')) add(12, 'Defanged link text', 'This format appears in safety notices and can also disguise a destination.');
  if (/^\[?\d{1,3}(\.\d{1,3}){3}\]?$/.test(host)) add(28, 'Numeric IP address', 'The link points directly to an IP address instead of a named service.');
  if (host.includes('xn--')) add(26, 'Encoded (punycode) domain', 'Punycode domains can disguise lookalike brand names.');
  if (url.protocol === 'http:') add(12, 'Unencrypted link', 'The link uses http, not https; anything entered there can be intercepted.');
  if (labels.filter((l) => l.includes('-')).length >= 2 || labels.some((l) => (l.match(/-/g) || []).length >= 3)) {
    add(12, 'Hyphen-heavy domain', 'Many hyphens are common in imitation domains such as "bank-secure-verify".');
  }
  if (RISKY_TLDS.has(labels[labels.length - 1])) add(14, 'High-abuse top-level domain', `The .${labels[labels.length - 1]} suffix is frequently used by low-cost disposable domains.`);
  if (SHORTENERS.has(host.replace(/^www\./, ''))) add(16, 'Link shortener', 'A shortened link hides the real destination; expand it only through a trusted tool.');
  if (url.port && !['80', '443'].includes(url.port)) add(10, 'Unusual port', 'The link uses a non-standard network port.');

  for (const brand of BRANDS) {
    if (registered === brand) continue;
    const distance = levenshtein(registered, brand);
    if (brand.length >= 4 && distance <= 1 && registered.length >= brand.length - 2) {
      add(26, `Lookalike domain: ${registered}`, `Very close to "${brand}" but not the same domain — a common typosquatting trick.`);
      break;
    }
  }
  if (labels.length >= 3) {
    const subdomain = labels.slice(0, -2).join('.');
    if (BRANDS.some((b) => subdomain.includes(b))) {
      add(18, 'Brand name in subdomain', 'The brand appears before the real domain; the site is controlled by whatever follows it.');
    }
  }
  const path = `${url.pathname} ${url.search}`.toLowerCase();
  if (/(login|signin|verify|otp|kyc|credential|password|account|update|claim|wallet)/.test(path)) {
    add(10, 'Sensitive-action path', 'The link path references login, verification or payment credentials.');
  }
  return { url: raw, score: clamp(score, 0, 100), findings };
}

export function inspectUrls(text) {
  const urls = extractUrls(text);
  const inspected = urls.map(inspectUrl);
  const findings = inspected.flatMap((item) => item.findings.map((f) => ({ ...f, url: item.url })));
  return { urls: inspected, score: clamp(Math.max(0, ...inspected.map((u) => u.score)), 0, 100), findings };
}
