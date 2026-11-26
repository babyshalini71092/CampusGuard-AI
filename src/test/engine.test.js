import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { validateMessage, validateImage, normalizeText, escapeForReport, MAX_MESSAGE_LENGTH } from '../engine/validate.js';
import { detectRules } from '../engine/rules.js';
import { extractUrls, inspectUrl, inspectUrls } from '../engine/urlInspection.js';
import { cosineSimilarity, createEmbedder } from '../engine/embeddings.js';
import { createSemanticAnalyzer } from '../engine/semantic.js';
import {
  analyzeMessage, combineScores, concernLevel, chooseCategory, CATEGORY_LABELS,
} from '../engine/analysis.js';
import { computePaymentAssessment, PAYMENT_QUESTIONS } from '../engine/payment.js';
import { generateRecoveryPlan } from '../engine/recovery.js';
import { SCENARIOS, evaluateChoice } from '../engine/simulation.js';
import { REFERENCE_MESSAGES } from '../engine/references.js';

const file = (type, size, name = 'shot.png') => ({ type, size, name });

describe('input validation', () => {
  it('rejects empty, non-string and oversized input', () => {
    expect(validateMessage('').ok).toBe(false);
    expect(validateMessage(null).ok).toBe(false);
    expect(validateMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1)).ok).toBe(false);
    expect(validateMessage('hello').ok).toBe(true);
  });
  it('normalizes zero-width characters and lookalikes', () => {
    expect(normalizeText('ВАЖНО\u200B test')).toBe('VAZhNO test');
    expect(normalizeText('  a\u00a0 b  ')).toBe('a b');
  });
  it('escapes markup for reports', () => {
    expect(escapeForReport('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('validates image type and size', () => {
    expect(validateImage(file('image/png', 100)).ok).toBe(true);
    expect(validateImage(file('application/pdf', 100)).ok).toBe(false);
    expect(validateImage(file('image/png', 6 * 1024 * 1024)).ok).toBe(false);
    expect(validateImage(file('image/jpeg', 0)).ok).toBe(false);
    expect(validateImage(null).ok).toBe(false);
  });
});

describe('rule matching', () => {
  it('detects OTP and fee requests with evidence', () => {
    const result = detectRules('Please share your OTP now. Pay a processing fee of Rs 500 via UPI.');
    expect(result.indicators.map((i) => i.id)).toContain('otp_share');
    expect(result.indicators.map((i) => i.id)).toContain('advance_fee');
    expect(result.score).toBeGreaterThan(50);
    expect(result.indicators[0].evidence.length).toBeGreaterThan(0);
  });
  it('does not treat financial vocabulary alone as suspicious', () => {
    const result = detectRules('The bank payment was credited to your account this morning.');
    expect(result.indicators).toHaveLength(0);
    expect(result.score).toBe(0);
  });
  it('requires a value transfer or a code handoff for contextual indicators', () => {
    const detect = (text) => detectRules(text).indicators.map(({ id }) => id);
    expect(detect('Purchase store vouchers and send me the redemption numbers.')).toContain('voucher_handoff');
    expect(detect('Email a photo of your authenticator code to the coordinator.')).toContain('code_handoff');
    expect(detect('Never send a photo of your authenticator code.')).not.toContain('code_handoff');
    expect(detect('Buy gift cards at the campus store and keep the codes private.')).not.toContain('voucher_handoff');
  });
  it('handles negation and safety guidance', () => {
    const result = detectRules('We never ask for your OTP. Do not share your password with anyone. No fee is charged.');
    expect(result.indicators.some((i) => i.id === 'otp_share')).toBe(false);
    expect(result.safetySignals.length).toBeGreaterThanOrEqual(2);
    expect(result.score).toBe(0);
  });
  it('requires urgency to be tied to an action', () => {
    expect(detectRules('Urgent meeting moved to 10 AM').score).toBe(0);
    expect(detectRules('Urgent: transfer the amount immediately').indicators.map((i) => i.id)).toContain('urgent_pressure');
  });
  it('caps the score at 100', () => {
    const result = detectRules('Share your OTP and password. You won a lottery. Pay a processing fee. Scan the QR to claim. Install AnyDesk.');
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('URL lexical inspection', () => {
  it('extracts URLs and never visits them', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('must not fetch'); });
    const urls = extractUrls('Open http://bank-verify.top/kyc or www.example.com now');
    expect(urls.length).toBeGreaterThanOrEqual(2);
    const findings = inspectUrls('http://bank-verify.top/kyc').findings.map((f) => f.label);
    expect(findings).toContain('Unencrypted link');
    expect(findings).toContain('High-abuse top-level domain');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('flags punycode, IP hosts and shorteners', () => {
    expect(inspectUrl('https://xn--paypal-8za.example.com').findings.map((f) => f.label)).toContain('Encoded (punycode) domain');
    expect(inspectUrl('http://192.168.1.4/verify').findings.map((f) => f.label)).toContain('Numeric IP address');
    expect(inspectUrl('https://bit.ly/abc').findings.map((f) => f.label)).toContain('Link shortener');
  });
  it('handles malformed URLs without throwing', () => {
    const result = inspectUrl('ht!tp::://bad[link');
    expect(result.score).toBeGreaterThan(0);
    expect(result.findings[0].label).toBe('Malformed URL');
  });
  it('inspects disguised addresses without turning the input into a clickable URL', () => {
    const value = 'hxxps://college.example@support.example[.]org/signin';
    const result = inspectUrls(`Address received: ${value}`);
    expect(result.urls[0].url).toBe(value);
    expect(result.findings.map(({ label }) => label)).toEqual(expect.arrayContaining([
      'Text before the actual host', 'Defanged link text', 'Sensitive-action path',
    ]));
  });
});

describe('semantic similarity', () => {
  it('calculates cosine similarity correctly', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(() => cosineSimilarity([1], [1, 2])).toThrow();
  });
  it('uses the injected model pipeline and produces deterministic comparisons', async () => {
    const calls = [];
    const embedder = createEmbedder({
      modelPath: '/fake',
      pipelineFactory: async () => async (texts) => {
        calls.push(texts);
        return { tolist: () => texts.map((t) => [t.includes('won') || t.includes('OTP') ? 1 : 0, t.includes('won') || t.includes('OTP') ? 0 : 1]) };
      },
    });
    const analyzer = createSemanticAnalyzer(embedder, [
      { text: 'You won a prize, share OTP', label: 'suspicious', category: 'prize_lottery' },
      { text: 'Meeting at ten', label: 'legitimate', category: 'personal' },
    ]);
    const [scam, duplicate] = await Promise.all([
      analyzer.analyze('You won a prize, share OTP'),
      analyzer.analyze('You won a prize, share OTP'),
    ]);
    expect(duplicate).toEqual(scam);
    expect(await analyzer.analyze('You won a prize, share OTP')).toEqual(scam);
    const benign = await analyzer.analyze('Meeting at ten');
    expect(embedder.getState().state).toBe('ready');
    expect(scam.score).toBeGreaterThan(benign.score);
    expect(scam.suggestedCategory).toBe('prize_lottery');
    expect(calls[0]).toHaveLength(2);
    expect(calls).toHaveLength(3);
  });
  it('reports unavailable state when model loading fails', async () => {
    const embedder = createEmbedder({ pipelineFactory: async () => { throw new Error('offline'); } });
    expect(await embedder.init()).toBe(false);
    expect(embedder.getState()).toMatchObject({ state: 'unavailable' });
    await expect(embedder.embed('x')).rejects.toThrow('not ready');
    const analyzer = createSemanticAnalyzer(embedder);
    expect(await analyzer.analyze('test')).toBeNull();
  });
  it('reference set is balanced and authored across categories', () => {
    const suspicious = REFERENCE_MESSAGES.filter((r) => r.label === 'suspicious').length;
    const legitimate = REFERENCE_MESSAGES.length - suspicious;
    expect(suspicious).toBeGreaterThan(20);
    expect(legitimate).toBeGreaterThanOrEqual(15);
  });
});

describe('score aggregation and analysis', () => {
  it('computes boundaries and renames concern levels', () => {
    expect(concernLevel(0)).toBe('low');
    expect(concernLevel(18)).toBe('moderate');
    expect(concernLevel(40)).toBe('elevated');
    expect(concernLevel(70)).toBe('high');
    expect(combineScores({ ruleScore: 100, urlScore: 0, semantic: null }).score).toBe(75);
    expect(combineScores({ ruleScore: 0, urlScore: 0, semantic: null }).score).toBe(0);
    const withModel = combineScores({ ruleScore: 100, urlScore: 100, semantic: { score: 100, reliability: 1 } });
    expect(withModel.weights.semantic).toBeCloseTo(0.2);
    expect(CATEGORY_LABELS.credential_phishing).toBeTruthy();
    expect(chooseCategory([], null, 10)).toBeNull();
  });
  it('rejects empty input', async () => {
    await expect(analyzeMessage('   ')).rejects.toThrow('Enter a message');
  });
  it('produces an explainable high score for a scam with rule-based fallback', async () => {
    const result = await analyzeMessage('You won Rs 25000 lottery. Share your OTP and pay a processing fee of Rs 500 now.');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe('high');
    expect(result.semanticUsed).toBe(false);
    expect(result.modelState).toBe('rule-based fallback');
    expect(result.aggregation.weights.semantic).toBe(0);
    expect(result.indicators.length).toBeGreaterThan(2);
    expect(result.steps.length).toBeGreaterThan(1);
    expect(result.limitations).toMatch(/not a calibrated probability/);
  });
  it('does not claim safety for legitimate messages', async () => {
    const result = await analyzeMessage('Your salary of Rs 42,000 was credited today. Reference SLP-20934. No action is required.');
    expect(result.score).toBeLessThan(18);
    expect(result.level).toBe('low');
    expect(result.category).toBeNull();
    expect(result.limitations).toMatch(/low score never proves/i);
  });
  it('marks ambiguous messages as uncertain', async () => {
    const result = await analyzeMessage('Hi, please confirm the amount tomorrow and let me know a good time.');
    expect(result.uncertain).toBe(true);
    expect(result.score).toBeLessThan(40);
  });
});

describe('student safety assessment', () => {
  it('requires all questions and escalates serious indicators', () => {
    const all = Object.fromEntries(PAYMENT_QUESTIONS.map((q) => [q.id, q.riskyAnswer]));
    const result = computePaymentAssessment(all);
    expect(result.score).toBe(100);
    expect(result.tier).toBe('stop');
    expect(result.progress).toBe(100);
    expect(result.avoid.length).toBeGreaterThan(2);
    expect(result.recommendation.title).toMatch(/Stop/);
  });
  it('gives a careful but non-guaranteed result when nothing is flagged', () => {
    const all = Object.fromEntries(PAYMENT_QUESTIONS.map((q) => [q.id, !q.riskyAnswer]));
    const result = computePaymentAssessment(all);
    expect(result.score).toBe(0);
    expect(result.tier).toBe('careful');
    expect(result.disclaimer).toMatch(/cannot verify/);
  });
  it('updates progressively and handles partial input', () => {
    const one = computePaymentAssessment({ credentials: true });
    expect(one.score).toBe(30);
    expect(one.tier).toBe('pause');
    expect(one.progress).toBe(13);
    const partial = computePaymentAssessment({ credentials: true, known: false });
    expect(partial.score).toBe(50);
    expect(partial.progress).toBe(25);
    expect(computePaymentAssessment({}).tier).toBe('incomplete');
    expect(computePaymentAssessment({ credentials: 'yes' }).answered).toBe(0);
  });
});

describe('recovery assistant', () => {
  it('generates relevant, ordered steps and includes official reporting', () => {
    const plan = generateRecoveryPlan({ transferred: true, credentials: true });
    expect(plan.urgent).toBe(true);
    expect(plan.steps[0].id).toBe('bank');
    expect(plan.steps.find((s) => s.id === 'report').url).toBe('https://cybercrime.gov.in');
    expect(plan.disclaimer).toMatch(/does not guarantee/);
  });
  it('handles no selection and unrelated selections', () => {
    expect(generateRecoveryPlan({}).steps.length).toBeGreaterThan(0);
    expect(generateRecoveryPlan({ personal: true }).steps.some((s) => s.id === 'bank')).toBe(false);
  });
});

describe('simulation', () => {
  it('evaluates choices and teaches a technique', () => {
    expect(evaluateChoice(SCENARIOS[0], 'verify').safe).toBe(true);
    expect(evaluateChoice(SCENARIOS[0], 'pay').safe).toBe(false);
    expect(evaluateChoice(SCENARIOS[0], 'missing')).toBeNull();
    expect(SCENARIOS.every((s) => s.technique && s.options.length >= 3)).toBe(true);
  });
});

describe('campus-specific detection', () => {
  it('detects student-focused warning signs across categories', async () => {
    const cases = [
      ['Congratulations! Your internship is confirmed. Pay Rs 1,500 registration fee today to receive the offer letter.', 'internship_fee'],
      ['This is Professor Rao. I need your bank details urgently for a scholarship list. Do not inform the office yet.', 'faculty_impersonation'],
      ['Your academic portal login has expired. Re-enter your college email and password at the link below.', 'academic_portal'],
      ['Hostel room allotment is ready. Transfer an advance payment of Rs 6,000 to the warden personal account to keep your room.', 'hostel_payment'],
      ['National Technical Fest registrations are open. Pay Rs 499 entry charge to the organiser UPI ID to reserve your workshop seat.', 'event_registration'],
    ];
    for (const [text, expected] of cases) {
      const result = await analyzeMessage(text);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.level).not.toBe('low');
      expect(result.indicators.length).toBeGreaterThan(0);
      if (expected) expect(result.category).toBe(expected);
    }
  });

  it('does not flag legitimate campus messages that mention payments, internships or deadlines', async () => {
    const legitimate = [
      'Placement cell notice: Infosys written test is scheduled for Friday at 10 AM in Lab 3. Bring your student ID and a pen.',
      'Semester fee payment window is open until the 25th. Pay only through the fee portal linked on the college website; no helper will collect cash.',
      'Project submission deadline is extended to Monday at 5 PM. Upload your report to the course portal; no late fee applies.',
      'The scholarship sanction order for eligible students has been uploaded. Check the official scholarship portal using your college login.',
    ];
    for (const text of legitimate) {
      const result = await analyzeMessage(text);
      expect(result.score).toBeLessThan(18);
      expect(result.category).toBeNull();
    }
  });

  it('keeps authored student references balanced and separate from evaluation cases', () => {
    const suspicious = REFERENCE_MESSAGES.filter((r) => r.label === 'suspicious').length;
    expect(suspicious).toBe(REFERENCE_MESSAGES.length - suspicious);
    expect(REFERENCE_MESSAGES.some((r) => /internship|scholarship|placement|hostel|fest|faculty|portal/i.test(r.text))).toBe(true);
    const evaluation = JSON.parse(fs.readFileSync(path.join(rootDir, 'evidence', 'evaluation-results.json'), 'utf8'));
    const evalTexts = evaluation.hybridWithModel.rows.map((r) => r.text);
    const overlap = evalTexts.filter((t) => REFERENCE_MESSAGES.some((r) => r.text === t));
    expect(overlap).toHaveLength(0);
  });
});
