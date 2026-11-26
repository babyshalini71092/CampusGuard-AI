/** Post-incident response workflow. Guidance only; reporting never guarantees recovery. */
export const INCIDENT_QUESTIONS = [
  { id: 'campus', prompt: 'Was the request related to a college activity?', hint: 'Internship, placement, scholarship, event, hostel or fee notice.' },
  { id: 'transferred', prompt: 'Did you transfer money or authorise a payment?', hint: 'UPI, IMPS, NEFT, card, cash or gift cards.' },
  { id: 'credentials', prompt: 'Did you share an OTP, UPI PIN, password or CVV?', hint: 'Or enter them on a suspicious page.' },
  { id: 'link', prompt: 'Did you click a suspicious link or download a file?', hint: 'Including a link opened on another device.' },
  { id: 'app', prompt: 'Did you install an unknown app or grant remote access?', hint: 'AnyDesk, TeamViewer, a fake banking app or an APK.' },
  { id: 'personal', prompt: 'Did you share identity documents or personal details?', hint: 'Aadhaar, PAN, address, date of birth or photos.' },
];

const ALL_STEPS = [
  { id: 'bank', priority: 1, tags: ['transferred'], title: 'Contact your bank or payment provider', detail: 'Use the official helpline or branch, never a number from the suspicious message. Ask them to try to block or recall the transaction and to secure your account.', group: 'Contain' },
  { id: 'records', priority: 2, tags: ['transferred'], title: 'Preserve transaction evidence', detail: 'Save the UPI reference number, SMS alerts, bank statement entries, chat screenshots, sender details and any email headers. Do not delete the conversation.', group: 'Contain' },
  { id: 'report', priority: 3, tags: ['transferred', 'credentials', 'personal'], title: 'Report suspected cybercrime', detail: 'File a report on the National Cyber Crime Reporting Portal at cybercrime.gov.in (report a financial fraud). You may also call the cybercrime helpline 1930. Reporting helps authorities act; it does not guarantee recovery of money.', group: 'Report', url: 'https://cybercrime.gov.in' },
  { id: 'credentials', priority: 4, tags: ['credentials'], title: 'Secure affected accounts', detail: 'Change passwords for the affected accounts from a trusted device, sign out other sessions, and enable two-factor authentication. Contact the provider if you cannot sign in.', group: 'Secure' },
  { id: 'device', priority: 5, tags: ['link', 'app'], title: 'Clean up the device you used', detail: 'Uninstall unknown apps, revoke remote-access or screen-sharing permissions, update your OS and browser, and run a reputable security scan. If you entered credentials, use a different clean device to change them.', group: 'Secure' },
  { id: 'review', priority: 6, tags: ['transferred', 'credentials', 'link', 'app', 'personal'], title: 'Review account activity and alerts', detail: 'Check recent transactions, mandates, saved payees and linked cards. Ask your bank to disable unexpected UPI mandates or autopay instructions.', group: 'Review' },
  { id: 'identity', priority: 7, tags: ['personal'], title: 'Limit misuse of personal information', detail: 'Be alert for follow-up calls that quote your details, do not accept requests based on them, and consider a fraud alert or additional verification with your bank.', group: 'Review' },
  { id: 'contacts', priority: 8, tags: ['link', 'personal'], title: 'Warn people who may be targeted', detail: 'If the scammer used your identity or contact list, tell close contacts that messages from you may be impersonating you.', group: 'Review' },
  { id: 'placement', priority: 11, tags: ['campus'], title: 'Inform the placement cell or training office', detail: 'If an internship, placement or job fee was involved, contact the placement cell using the number on the college website. Ask whether other students received the same message.', group: 'Campus' },
  { id: 'admin', priority: 12, tags: ['campus'], title: 'Notify college administration or IT helpdesk', detail: 'For fake fee notices, faculty impersonation or academic portal logins, report the message through the official helpdesk or administrative office.', group: 'Campus' },
  { id: 'organiser', priority: 13, tags: ['campus'], title: 'Confirm with the event organiser or warden', detail: 'For event registration or hostel payments, contact the organiser or warden using official contact details, not the number in the message.', group: 'Campus' },
  { id: 'followup', priority: 10, tags: [], title: 'Keep a dated record of follow-up', detail: 'Note who you contacted, when, and any reference numbers. Check back with your bank and the reporting portal using official channels only.', group: 'Follow up' },
];

export function generateRecoveryPlan(answers = {}) {
  const selected = INCIDENT_QUESTIONS.filter((q) => answers[q.id] === true).map((q) => q.id);
  const steps = ALL_STEPS
    .filter((step) => step.tags.length === 0 || step.tags.some((tag) => selected.includes(tag)))
    .sort((a, b) => a.priority - b.priority)
    .map((step) => ({ ...step, relevant: step.tags.length > 0 }));
  const urgent = selected.includes('transferred') || selected.includes('credentials') || selected.includes('campus');
  return {
    selected,
    steps,
    urgent,
    headline: selected.length === 0
      ? 'Nothing selected yet — choose what happened to build your checklist.'
      : urgent ? 'Act quickly, but carefully. Work through the first steps today.' : 'Work through these steps over the next day.',
    disclaimer: 'Guidance is general and not legal or financial advice. Reporting or contacting a bank does not guarantee that lost money will be recovered. If you are in immediate danger, contact local emergency services.',
  };
}
