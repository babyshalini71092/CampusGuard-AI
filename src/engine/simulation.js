/** Campus-focused practice scenarios with explanations and verification habits. */
export const SCENARIOS = [
  {
    id: 'internship',
    title: 'The internship that needs a "refundable" fee',
    context: 'A message from an unknown number says you are selected for a paid internship at a well-known company. The "HR team" asks for Rs 1,500 as a registration fee and says the offer will be given to the next student in 30 minutes.',
    options: [
      { id: 'pay', label: 'Pay quickly so you do not lose the offer', outcome: 'risky', explanation: 'A deadline plus a registration fee is the classic internship-scam pattern. Genuine employers do not charge candidates.' },
      { id: 'verify', label: 'Check the offer with the placement cell using the college website number', outcome: 'good', explanation: 'An independent check through an official campus channel breaks the impersonation loop.' },
      { id: 'friend', label: 'Ask a friend whether Rs 1,500 sounds normal', outcome: 'partial', explanation: 'Asking helps, but the decisive check is the employer or placement office through a published contact.' },
    ],
    technique: 'Never pay to receive an offer letter. Verify internships through the placement cell or the company’s published website.',
    category: 'Internships',
  },
  {
    id: 'scholarship',
    title: 'Scholarship with a processing charge',
    context: 'A WhatsApp forward says your scholarship of Rs 25,000 is approved, but a Rs 990 processing fee must be paid to release the first instalment. It asks you to confirm Aadhaar details on a link.',
    options: [
      { id: 'link', label: 'Open the link and enter the details', outcome: 'risky', explanation: 'Scholarships are not released after a processing fee, and identity details on a forwarded link can be misused.' },
      { id: 'portal', label: 'Open the official scholarship portal yourself and check the status', outcome: 'good', explanation: 'The portal shows the real sanction status without using any link from the message.' },
      { id: 'small', label: 'Pay Rs 990 because the scholarship is much larger', outcome: 'risky', explanation: 'A small upfront payment is the bait; it does not establish that the scholarship is real.' },
    ],
    technique: 'Scholarship results and sanction orders appear on the official portal. If a fee is demanded, report it to the scholarship office.',
    category: 'Scholarships',
  },
  {
    id: 'faculty',
    title: 'A "professor" needs your details urgently',
    context: 'A new number messages you: "This is Professor Rao. I need your Aadhaar and bank details for an urgent scholarship list. Do not inform the office yet; I will collect them in the morning."',
    options: [
      { id: 'share', label: 'Share the details privately to help the professor', outcome: 'risky', explanation: 'Faculty never need your Aadhaar and bank details over chat, and secrecy is a strong warning sign.' },
      { id: 'call', label: 'Call the professor on the number saved by the department', outcome: 'good', explanation: 'A saved or published contact lets you confirm whether the request is real.' },
      { id: 'reply', label: 'Reply asking for more information', outcome: 'partial', explanation: 'Replying confirms your number is active; verifying through a separate official channel is safer.' },
    ],
    technique: 'Confirm any "faculty" request through the department’s published contact. Never share identity or bank details because of a chat message.',
    category: 'Faculty impersonation',
  },
  {
    id: 'event',
    title: 'A technical fest seat for Rs 499',
    context: 'A poster in a student group advertises a workshop with limited seats. The organiser asks for Rs 499 to a personal UPI ID and promises an event kit. The college website lists the same event as free for students with a valid ID.',
    options: [
      { id: 'pay', label: 'Pay immediately to reserve the seat', outcome: 'risky', explanation: 'Paying a personal account for an event listed as free is a clear channel mismatch.' },
      { id: 'website', label: 'Register through the official event page listed on the college website', outcome: 'good', explanation: 'The official page confirms the real registration terms and avoids the personal account.' },
      { id: 'forward', label: 'Forward the poster to classmates so they can pay too', outcome: 'risky', explanation: 'Forwarding an unverified payment request can spread the scam to friends.' },
    ],
    technique: 'Check campus events on the college website or official student portal before paying anyone.',
    category: 'Campus events',
  },
  {
    id: 'portal',
    title: 'Your academic portal has "expired"',
    context: 'An email says your student portal login has expired and asks you to re-enter your college email and password on a page linked in the message. The sender address is a free email service.',
    options: [
      { id: 'enter', label: 'Enter the credentials to avoid losing access', outcome: 'risky', explanation: 'A free-email sender and a password re-entry link form a typical credential-phishing pattern.' },
      { id: 'type', label: 'Type the portal address from the college website into your browser', outcome: 'good', explanation: 'Typing the known address yourself avoids the link entirely and shows any real notices.' },
      { id: 'delete', label: 'Ignore it and never check the portal', outcome: 'partial', explanation: 'Ignoring the link is fine, but you should still check the portal through its official address for genuine notices.' },
    ],
    technique: 'Reach academic and placement portals through the college website or an app you already use — never through a password-reset link in a message.',
    category: 'Portal phishing',
  },
];

export function evaluateChoice(scenario, optionId) {
  const option = scenario.options.find((o) => o.id === optionId);
  if (!option) return null;
  return { ...option, safe: option.outcome === 'good' };
}
