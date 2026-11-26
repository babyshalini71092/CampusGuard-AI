/**
 * Small, held-out demonstration evaluation (NOT a production benchmark).
 * Messages here are separate from the semantic reference set.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEmbedder } from '../src/engine/embeddings.js';
import { createSemanticAnalyzer } from '../src/engine/semantic.js';
import { analyzeMessage } from '../src/engine/analysis.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = [
  // suspicious student messages (10) — disjoint from semantic references
  ['An unknown email offers an internship and asks for a Rs 2,200 security deposit to confirm your seat by tonight.', 'suspicious'],
  ['Scholarship disbursal is delayed. Pay Rs 850 processing charge through this UPI link to receive the instalment.', 'suspicious'],
  ['The HOD has messaged privately for Aadhaar scans before the placement list is finalised. Keep it confidential.', 'suspicious'],
  ['Tech fest workshop seats are closing. Send Rs 650 registration charge to the organiser personal account now.', 'suspicious'],
  ['Hostel allotment is on hold until a Rs 5,000 advance is transferred to the warden account today.', 'suspicious'],
  ['Your academic portal password has expired. Re-enter your college credentials on the page linked in this email.', 'suspicious'],
  ['Placement shortlist is ready but Rs 1,200 documentation fee must be paid before the interview call is issued.', 'suspicious'],
  ['College fee notice: transfer the pending semester amount to this personal account; the official portal is down.', 'suspicious'],
  ['You won a campus contest voucher. Pay Rs 299 claim charge and share the OTP to collect it.', 'suspicious'],
  ['Part-time library job, earn Rs 1,200 a day from your room. Pay a one-time training fee to unlock tasks.', 'suspicious'],
  // legitimate student messages, including hard negatives (10)
  ['Placement training timetable is published. Collect your badge from the cell; no fee is charged for the session.', 'legitimate'],
  ['The scholarship instalment has been credited. Verify the amount in the official portal using your roll number.', 'legitimate'],
  ['Library opening hours are extended during exams. Renew your books through the library portal.', 'legitimate'],
  ['The annual tech fest is free for students with a college ID. Register on the official event website.', 'legitimate'],
  ['Hostel maintenance will begin Tuesday morning. Residents may use the common room during the work.', 'legitimate'],
  ['Professor Mehta will hold extra guidance hours on Wednesday. Submit your synopsis through the course portal.', 'legitimate'],
  ['Semester fee payment is open until the 25th. Use only the payment gateway linked from the college website.', 'legitimate'],
  ['Cyber safety workshop today: never share your OTP or UPI PIN. Report suspicious messages to the IT helpdesk.', 'legitimate'],
  ['Internal assessment results are available on the academic portal. Log in with your college credentials.', 'legitimate'],
  ['Are we still meeting at the library at 5 PM? I will bring the notes from the last lecture.', 'legitimate'],
];

const embedder = createEmbedder({ modelPath: path.join(root, 'public', 'models', 'minilm') });
const semantic = createSemanticAnalyzer(embedder);
await semantic.prepare();

async function evaluate(withSemantic) {
  const rows = [];
  for (const [text, expected] of cases) {
    const result = await analyzeMessage(text, { semantic: withSemantic ? semantic : null });
    rows.push({
      text, expected, score: result.score, level: result.level,
      flagged: result.score >= 40, uncertain: result.uncertain,
      category: result.category, semanticUsed: result.semanticUsed,
    });
  }
  const tp = rows.filter((r) => r.expected === 'suspicious' && r.flagged).length;
  const fn = rows.filter((r) => r.expected === 'suspicious' && !r.flagged).length;
  const fp = rows.filter((r) => r.expected === 'legitimate' && r.flagged).length;
  const tn = rows.filter((r) => r.expected === 'legitimate' && !r.flagged).length;
  return {
    n: rows.length, threshold: 'warning-sign score >= 40',
    truePositives: tp, falseNegatives: fn, falsePositives: fp, trueNegatives: tn,
    missedExamples: rows.filter((r) => (r.expected === 'suspicious' && !r.flagged) || (r.expected === 'legitimate' && r.flagged)),
    rows,
  };
}

const output = {
  note: 'Small authored demonstration set, disjoint from the semantic reference examples. Not a validation of real-world performance.',
  model: 'Xenova/all-MiniLM-L6-v2 quantized ONNX via Transformers.js',
  rulesOnly: await evaluate(false),
  hybridWithModel: await evaluate(true),
};
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence', 'evaluation-results.json'), JSON.stringify(output, null, 2));
console.log(JSON.stringify({
  n: output.hybridWithModel.n,
  rulesOnly: { tp: output.rulesOnly.truePositives, fn: output.rulesOnly.falseNegatives, fp: output.rulesOnly.falsePositives, tn: output.rulesOnly.trueNegatives },
  hybrid: { tp: output.hybridWithModel.truePositives, fn: output.hybridWithModel.falseNegatives, fp: output.hybridWithModel.falsePositives, tn: output.hybridWithModel.trueNegatives },
  hybridMisses: output.hybridWithModel.missedExamples.map((r) => ({ expected: r.expected, score: r.score, text: r.text.slice(0, 80) })),
}, null, 2));
