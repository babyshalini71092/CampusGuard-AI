/** Transparent hybrid assessment: rules + URL lexical checks + semantic similarity. */
import { validateMessage, clamp, ValidationError } from './validate.js';
import { detectRules } from './rules.js';
import { inspectUrls } from './urlInspection.js';

export const CATEGORY_LABELS = {
  credential_phishing: 'Credential or KYC phishing',
  advance_fee_job: 'Advance-fee / job scam',
  prize_lottery: 'Prize or lottery scam',
  investment: 'Investment scam',
  delivery_refund: 'Delivery or refund scam',
  impersonation: 'Impersonation',
  tech_support: 'Tech-support scam',
  upi_request: 'UPI collect / wrong-transfer request',
  qr_scam: 'QR-code payment scam',
  pressure: 'Pressure tactic',
  phishing: 'Suspicious link',
  indirect: 'Possible indirect payment request',
  campus_fee: 'Internship / placement / scholarship fee scam',
  faculty_impersonation: 'Fake faculty or campus official',
  academic_portal: 'Fake academic portal login',
  event_registration: 'Fake event registration charge',
  hostel_payment: 'Hostel advance-payment scam',
  placement_scam: 'Placement offer scam',
  scholarship_fee: 'Scholarship processing-fee scam',
  internship_fee: 'Internship registration-fee scam',
  college_fee_impersonation: 'College fee impersonation',
  campus_job: 'Campus part-time job scam',
  campus_payment: 'Student payment / refund scam',
};

const CAMPUS_CATEGORIES = [
  'internship_fee', 'placement_scam', 'scholarship_fee', 'college_fee_impersonation',
  'event_registration', 'hostel_payment', 'academic_portal', 'faculty_impersonation',
  'campus_job', 'campus_payment', 'campus_fee',
];

const BASE_WEIGHTS = { rules: 0.55, url: 0.25, semantic: 0.20 };
const FALLBACK_WEIGHTS = { rules: 0.75, url: 0.25, semantic: 0 };

export function concernLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'elevated';
  if (score >= 18) return 'moderate';
  return 'low';
}

export function combineScores({ ruleScore, urlScore, semantic }) {
  const semanticWeight = semantic ? BASE_WEIGHTS.semantic * semantic.reliability : 0;
  const source = semanticWeight > 0 ? BASE_WEIGHTS : FALLBACK_WEIGHTS;
  const total = source.rules + source.url + semanticWeight;
  const weights = {
    rules: source.rules / total,
    url: source.url / total,
    semantic: semanticWeight / total,
  };
  const parts = {
    rules: ruleScore * weights.rules,
    url: urlScore * weights.url,
    semantic: (semantic?.score || 0) * weights.semantic,
  };
  return {
    score: clamp(Math.round(parts.rules + parts.url + parts.semantic), 0, 100),
    weights,
    contributions: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Number(v.toFixed(1))])),
  };
}

export function chooseCategory(ruleCategories, semantic, score) {
  if (score < 18) return null;
  // Prefer the most specific campus label when several broad rules fire on
  // the same message (for example, a fee rule and an internship-fee rule).
  const campus = CAMPUS_CATEGORIES.find((category) => ruleCategories.includes(category));
  if (campus) return campus;
  if (ruleCategories.length) return ruleCategories[0];
  if (semantic?.suggestedCategory && semantic.gap > 0.05) return semantic.suggestedCategory;
  if (score >= 40) return 'indirect';
  return null;
}

export function nextSteps(indicators, semantic, level) {
  const steps = [];
  const has = (id) => indicators.some((i) => i.id === id);
  if (level === 'high') steps.push('Stop. Do not transfer money, approve a request or reply to this message.');
  if (has('otp_share') || has('code_handoff') || has('pin_password') || has('identity_docs')) {
    steps.push('Never share an OTP, UPI PIN, CVV or password. No legitimate verifier needs them.');
  }
  if (has('advance_fee') || has('delivery_charge') || has('overpayment')) {
    steps.push('Do not pay a fee to release a prize, refund, parcel or job offer.');
  }
  if (has('campus_fee') || has('offer_payment_gate') || has('event_registration') || has('hostel_advance')) {
    steps.push('Check the opportunity or fee with the placement cell, scholarship office or college administration using a number from the official website.');
  }
  if (has('faculty_impersonation') || has('channel_mismatch')) {
    steps.push('Confirm with the faculty member or department through a saved contact, not the number in the message.');
  }
  if (has('academic_portal')) {
    steps.push('Open the academic portal from the college website yourself; never email a password or OTP.');
  }
  if (has('guaranteed_returns')) steps.push('Check the firm on the official regulator or exchange register before investing any money.');
  if (has('impersonation_ask') || has('kyc_link')) {
    steps.push('Contact the organisation using the number or app you already trust — not a contact in the message.');
  }
  if (has('remote_access')) steps.push('Do not install remote-access software; disconnect the device if you already did.');
  if (has('secrecy')) steps.push('Tell a trusted person or family member before acting on a secret request.');
  if (has('voucher_handoff')) steps.push('Keep gift-card codes private and verify the request with the person through an existing contact.');
  if (has('qr_receive')) steps.push('Remember that scanning a QR code to "receive" money can actually authorise a payment.');
  if (semantic?.weakEvidence) steps.push('The semantic comparison was inconclusive; rely on independent verification, not this score.');
  if (steps.length === 0) steps.push('Verify the request through a channel you already trust before you act.');
  steps.push('If money was already sent, open the Recovery Assistant from the navigation.');
  return [...new Set(steps)].slice(0, 7);
}

/**
 * Analyze a message. `semantic` is optional and only contributes when the
 * pretrained model is actually ready; otherwise the result is explicitly
 * marked as rule-based fallback.
 */
export async function analyzeMessage(rawText, { semantic = null } = {}) {
  const validated = validateMessage(rawText);
  if (!validated.ok) throw new ValidationError(validated.error);
  const text = validated.text;

  const rules = detectRules(text);
  const urls = inspectUrls(text);
  let semanticResult = null;
  let modelError = null;
  if (semantic) {
    try {
      semanticResult = await semantic.analyze(text);
    } catch (cause) {
      modelError = cause instanceof Error ? cause.message : String(cause);
    }
  }
  const effectiveSemantic = semanticResult && !semanticResult.weakEvidence ? semanticResult : null;
  const aggregation = combineScores({ ruleScore: rules.score, urlScore: urls.score, semantic: effectiveSemantic });
  // A single high-confidence indicator (e.g. an OTP request) must not be
  // diluted into a low score just because no other pattern happens to match.
  const strongest = rules.indicators.reduce((max, i) => Math.max(max, i.weight), 0);
  const ruleAndLinkScore = Math.round(rules.score * FALLBACK_WEIGHTS.rules + urls.score * FALLBACK_WEIGHTS.url);
  const minimum = strongest >= 27 ? 45 : ruleAndLinkScore >= 40 ? 40 : 0;
  if (aggregation.score < minimum) {
    aggregation.floorApplied = {
      from: aggregation.score, to: minimum,
      trigger: strongest >= 27 ? rules.indicators.find((i) => i.weight === strongest)?.label : 'Combined rule and link indicators',
    };
    aggregation.score = minimum;
  }
  const level = concernLevel(aggregation.score);
  const category = chooseCategory(rules.categories, semanticResult, aggregation.score);
  const signalCount = rules.indicators.length + urls.findings.length;
  const uncertaintyReason = signalCount === 0 ? 'No rule or link indicator corroborates the assessment.'
    : signalsDisagree(rules, semanticResult) ? 'The rule and semantic evidence point in different directions.'
      : semanticResult?.weakEvidence ? 'The semantic comparison has a weak or inconclusive match.'
        : aggregation.score >= 15 && aggregation.score <= 65 ? 'The combined evidence leaves room for doubt.' : null;

  return {
    text,
    score: aggregation.score,
    level,
    category,
    categoryLabel: category ? CATEGORY_LABELS[category] || category.replace(/_/g, ' ') : null,
    indicators: rules.indicators,
    safetySignals: rules.safetySignals,
    urlFindings: urls.findings,
    urls: urls.urls,
    semantic: semanticResult,
    semanticUsed: Boolean(effectiveSemantic),
    modelState: semanticResult ? 'ready' : (modelError ? 'error' : 'rule-based fallback'),
    aggregation,
    uncertain: Boolean(uncertaintyReason),
    uncertaintyReason,
    steps: nextSteps(rules.indicators, semanticResult, level),
    limitations: 'This is a heuristic student-safety assessment, not a calibrated probability or a guarantee. A low score never proves a message is safe, and new scam wording can evade these checks. Always verify with an official campus channel before acting.',
  };
}

function signalsDisagree(rules, semantic) {
  if (!semantic || semantic.weakEvidence) return false;
  return rules.score >= 55 && semantic.score <= 25 && semantic.gap < -0.08;
}
