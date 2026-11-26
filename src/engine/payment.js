/** Student Safety Assessment: decision support before paying or sharing anything. */

export const PAYMENT_QUESTIONS = [
  { id: 'known', prompt: 'Do you personally know the person or organisation asking for payment?', hint: 'A verifiable college office, employer or student you already know.', riskyAnswer: false, weight: 20, category: 'relationship' },
  { id: 'verified', prompt: 'Have you verified the request through an official campus channel?', hint: 'Placement cell, scholarship office, college website or a saved phone number.', riskyAnswer: false, weight: 24, category: 'official' },
  { id: 'pressure', prompt: 'Are you being pushed to pay or decide immediately?', hint: '"Seat will be lost", "offer expires today", threats or secrecy.', riskyAnswer: true, weight: 18, category: 'pressure' },
  { id: 'advance', prompt: 'Is a registration, processing or advance fee required?', hint: 'For an internship, placement, scholarship, event, hostel or seat confirmation.', riskyAnswer: true, weight: 24, category: 'fee' },
  { id: 'credentials', prompt: 'Have you been asked for an OTP, UPI PIN, password or CVV?', hint: 'Or to re-enter your college portal credentials on a page from a message.', riskyAnswer: true, weight: 30, category: 'credentials' },
  { id: 'returns', prompt: 'Were you promised a guaranteed placement, stipend or unusually high return?', hint: 'Especially without a written offer or a verifiable employer.', riskyAnswer: true, weight: 22, category: 'guarantee' },
  { id: 'qr', prompt: 'Were you asked to scan a QR to receive money or enter a PIN for a refund?', hint: 'A UPI PIN is not needed to receive a credit.', riskyAnswer: true, weight: 22, category: 'qr' },
  { id: 'unexpected', prompt: 'Did the request arrive from a new number or unexpected account?', hint: 'Particularly if it claims to be faculty, a warden or an official placement contact.', riskyAnswer: true, weight: 14, category: 'channel' },
];

export function computePaymentAssessment(answers = {}) {
  const answered = PAYMENT_QUESTIONS.filter((q) => Object.prototype.hasOwnProperty.call(answers, q.id) && typeof answers[q.id] === 'boolean');
  const triggered = answered.filter((q) => answers[q.id] === q.riskyAnswer);
  const score = Math.min(100, triggered.reduce((sum, q) => sum + q.weight, 0));
  const progress = Math.round((answered.length / PAYMENT_QUESTIONS.length) * 100);
  const tier = score >= 55 ? 'stop' : score >= 25 ? 'pause' : score >= 1 ? 'review' : (answered.length === PAYMENT_QUESTIONS.length ? 'careful' : 'incomplete');

  const findings = triggered.map((q) => ({ id: q.id, prompt: q.prompt, category: q.category, weight: q.weight }));
  const verify = [];
  const avoid = [];
  const checklist = [];

  if (triggered.some((q) => q.category === 'relationship' || q.category === 'channel')) {
    verify.push('Call the faculty member, warden, employer or placement contact using a number you already have saved — not one in the message.');
    checklist.push('Confirm the sender using a saved contact');
  }
  if (triggered.some((q) => q.category === 'official')) {
    verify.push('Check the notice on the college website or official student portal before responding.');
  } else {
    verify.push('Confirm the request on the official campus portal or with the concerned office.');
  }
  if (triggered.some((q) => q.category === 'fee')) {
    avoid.push('Paying a "registration", "processing", "activation" or "refundable" fee to secure a seat, offer or scholarship.');
    checklist.push('Refuse any advance payment until the office confirms it');
  }
  if (triggered.some((q) => q.category === 'credentials')) {
    avoid.push('Sharing an OTP, UPI PIN, CVV or college portal password with anyone, including someone claiming to be support staff.');
    checklist.push('Keep all authentication secrets to yourself');
  }
  if (triggered.some((q) => q.category === 'pressure')) {
    avoid.push('Acting on a countdown or threat; close the chat and ask the placement cell or a family member.');
    checklist.push('Pause the payment and ignore the deadline in the message');
  }
  if (triggered.some((q) => q.category === 'guarantee')) {
    verify.push('Ask the placement cell or training office to confirm the offer in writing before you rely on it.');
    avoid.push('Trusting a guaranteed placement or stipend that is not on an official offer letter.');
  }
  if (triggered.some((q) => q.category === 'qr')) {
    avoid.push('Scanning a QR to "receive" money or entering a UPI PIN to approve a credit.');
    checklist.push('Treat QR codes as payment instructions, not receipts');
  }
  if (triggered.some((q) => q.category === 'official')) {
    checklist.push('Verify the request on an official campus channel');
  }
  checklist.push('Re-read the payee name and amount on the confirmation screen before authorising');

  const recommendation = {
    stop: {
      title: 'Stop and verify with the campus office',
      body: 'Several answers match student-targeted scam patterns. Do not pay or share anything until the request is confirmed through an official college channel.',
    },
    pause: {
      title: 'Pause and check officially',
      body: 'At least one meaningful warning sign is present. Confirm the request with the placement cell, scholarship office or college website before proceeding.',
    },
    review: {
      title: 'Review the warning sign',
      body: 'One answer needs attention. Confirm the details with an official campus contact before you act.',
    },
    careful: {
      title: 'No warning signs selected',
      body: 'Nothing in your answers raised a flag. This is not a guarantee: still check the payee name and amount on the confirmation screen.',
    },
    incomplete: {
      title: 'Answer all questions for a fuller assessment',
      body: 'The assessment updates as you answer. Unanswered questions cannot be checked.',
    },
  }[tier];

  return {
    score, tier, progress, answered: answered.length,
    findings, verify: [...new Set(verify)], avoid: [...new Set(avoid)], checklist: [...new Set(checklist)],
    recommendation,
    disclaimer: 'This checklist supports your decision; it cannot verify a person, employer, scholarship or transaction and does not guarantee safety.',
  };
}
