/**
 * Independently implemented deterministic indicators.
 *
 * Design principle: a financial word by itself is never evidence. Every rule
 * needs an action, a request, or a specific combination of context. Explicit
 * safety/negation language suppresses matching indicators.
 */
import { clamp } from './validate.js';

const negatedJustBefore = (text, index) => {
  const prefix = text.slice(Math.max(0, index - 60), index);
  const lastBoundary = Math.max(prefix.lastIndexOf('.'), prefix.lastIndexOf('!'), prefix.lastIndexOf('?'), prefix.lastIndexOf('\n'));
  const clause = prefix.slice(lastBoundary + 1).toLowerCase();
  return /(?:never|do\s*n[o']?t|not|without|avoid|ignore|no)\s+(?:\w+\s+){0,4}$/.test(clause);
};

/**
 * id, label, category, weight, patterns and a plain-language explanation.
 * `extra` (optional) receives the match and can veto it.
 */
export const RULES = [
  {
    id: 'code_handoff', label: 'Requests a copy of an authentication code', category: 'credential_phishing', weight: 38,
    patterns: [/\b(?:send|share|forward|reply\s+with|email|upload|dm)\b[^.!?\n]{0,45}\b(?:login|sign[- ]in|authenticator|recovery)\s+code\b/gi, /\b(?:send|share|forward|reply\s+with|email|upload|dm)\b[^.!?\n]{0,45}\b(?:photo(?:graph)?|screenshot|picture|copy)\b[^.!?\n]{0,35}\b(?:verification\s+code|one[- ]time\s+code|otp)\b/gi],
    detail: 'An authentication code remains a secret when it is shown in a screenshot or copied into a reply.',
  },
  {
    id: 'voucher_handoff', label: 'Requests transfer of gift-card value', category: 'impersonation', weight: 32,
    patterns: [/\b(?:buy|purchase|order|get)\b[^!?\n]{0,45}\b(?:gift\s*cards?|vouchers?)\b[^!?\n]{0,70}\b(?:send|share|forward|dm|message|text)\b[^!?\n]{0,35}\b(?:codes?|numbers?|pins?)\b/gi],
    detail: 'Sending the redemption code gives the recipient the value of the card, even when they promise reimbursement.',
  },
  {
    id: 'offer_payment_gate', label: 'Payment required to unlock an opportunity', category: 'campus_fee', weight: 32,
    patterns: [/\b(?:pay|transfer|reimburse|send|bhejo|dena)\b[^.!?\n]{0,45}\b(?:bond|deposit|fee|charge|training\s+kit|token)\b[^.!?\n]{0,40}\b(?:before|to|phir|then)\b[^.!?\n]{0,30}\b(?:offer|join(?:ing)?|interview|payroll|mentor|stipend|grant)\b/gi, /\b(?:offer\s+(?:letter|pdf)|joining\s+letter|stipend|scholarship|grant)\b[^.!?\n]{0,45}\b(?:after|until|once)\b[^.!?\n]{0,40}\b(?:pay|transfer|reimburse|send|bhejo)\b[^.!?\n]{0,40}\b(?:fee|charge|bond|deposit|token)\b/gi, /\b(?:deposit|fee|charge|token)\b[^.!?\n]{0,20}\b(?:dena|bhejo|bhej\s+do)\b[^.!?\n]{0,30}\bphir\b[^.!?\n]{0,20}\b(?:joining|offer|stipend)\b/gi],
    detail: 'The request makes an offer, award or place conditional on paying first. Confirm the terms with the campus office.',
  },
  {
    id: 'otp_share', label: 'Asks for an OTP or verification code', category: 'credential_phishing', weight: 38,
    patterns: [/\b(share|send|give|provide|tell|enter|confirm|type)\b[^.!\n]{0,45}\b(?:your\s+)?(?:otp|one[- ]time\s+(?:code|password)|verification\s+code)\b/gi, /\b(?:otp|verification\s+code)\b[^.!\n]{0,25}\b(is|to\s+be\s+shared)\s*[:\-]?\s*\d{4,8}\b/gi],
    detail: 'Real banks and payment apps never ask customers to disclose an OTP. Sharing one can authorise a transfer.',
  },
  {
    id: 'pin_password', label: 'Asks for a PIN, password or CVV', category: 'credential_phishing', weight: 36,
    patterns: [/\b(share|send|give|provide|enter|confirm|re[- ]?enter|verify)\b[^.!\n]{0,45}\b(?:your\s+)?(?:upi\s+pin|card\s+pin|password|cvv|login\s+credentials?|net\s+banking\s+password)\b/gi, /\b(?:password|credentials?)\b[^.!\n]{0,25}\b(expired|reset|update)\b/gi],
    detail: 'Requests for authentication secrets are a direct account-takeover pattern.',
  },
  {
    id: 'identity_docs', label: 'Requests identity documents in chat', category: 'credential_phishing', weight: 26,
    patterns: [/\b(share|send|upload|submit)\b[^.!\n]{0,45}\b(?:aadhaar|pan\s+card|identity\s+proof|id\s+proof|passport)\b/gi, /\b(?:aadhaar|pan)\s*(?:card\s*)?(?:number|details)\b/gi],
    detail: 'Identity documents shared over chat can be reused for impersonation or account takeover.',
  },
  {
    id: 'internship_fee', label: 'Fee demanded for an internship or placement', category: 'internship_fee', weight: 26,
    patterns: [/\b(?:internship|placement|offer\s+letter)\b[\s\S]{0,80}\b(?:registration|processing|activation|verification|confirmation|security)\s+(?:fee|charge|amount|deposit)\b/gi],
    detail: 'Genuine internships and campus placements do not ask candidates to pay for an offer or registration.',
  },
  {
    id: 'advance_fee', label: 'Advance or processing fee demanded', category: 'advance_fee', weight: 32,
    patterns: [/\b(registration|joining|processing|activation|verification|documentation|training|onboarding|security|refundable)\b[^.!\n]{0,30}\b(fee|charge|amount|deposit|payment)\b/gi, /\b(?:pay|transfer|send|bhejo|karo)\b[^.!\n]{0,30}\b(?:rs\.?|₹)\s?\d{2,}\b/gi, /\b(?:fee|charges?)\s*(?:se|ka)?\s*(?:bhejo|bhejdo|dena|karo)\b/gi],
    detail: 'A fee demanded before a job, refund or benefit is a classic advance-payment pattern.',
  },
  {
    id: 'prize', label: 'Unsolicited prize or lottery claim', category: 'prize_lottery', weight: 32,
    patterns: [/\b(you\s+(?:have\s+)?won|congratulations|lucky\s*(?:draw|winner)|selected\s+as\s+(?:a\s+)?winner|lottery)\b/gi, /\b(?:claim|collect)\b[^.!\n]{0,30}\b(?:prize|reward|voucher|jackpot|lottery)\b/gi],
    detail: 'Prizes you did not enter, especially with a fee attached, are widely used as bait.',
  },
  {
    id: 'guaranteed_returns', label: 'Promised or guaranteed high returns', category: 'investment', weight: 28,
    patterns: [/\b(guaranteed|assured|fixed)\b[^.!\n]{0,35}\b(returns?|profit|income|interest)\b/gi, /\b(double\s+your\s+money|\d{1,3}\s?%\s*(?:per|monthly|daily|weekly)|easy\s+money)\b/gi, /\b\d{1,3}\s?%[^.!\n]{0,30}\b(?:month|week|day)\b/gi, /\brisk[-\s]free\b[^.!\n]{0,40}\b(?:investment|returns?|profit|trading)\b|\b(?:investment|returns?|profit)\b[^.!\n]{0,40}\brisk[-\s]free\b/gi],
    detail: 'Guaranteed or unusually high short-term returns are a hallmark of investment fraud.',
  },
  {
    id: 'account_threat', label: 'Threat to block or freeze an account', category: 'impersonation', weight: 22,
    patterns: [/\b(?:account|card|net\s*banking|upi\s*id)\b[^.!\n]{0,45}\b(?:will\s+be\s+|is\s+|get\s+)?(?:blocked|suspended|frozen|expired|locked|deactivated|closed)\b/gi, /\b(?:kyc|verification)\b[^.!\n]{0,45}\b(?:pending|incomplete)\b[^.!\n]{0,45}\b(?:blocked|frozen|suspended|closed)\b/gi],
    detail: 'Threatening to block an account is a common way to push a reader into an unverified "verification" step.',
  },
  {
    id: 'urgent_pressure', label: 'Urgency tied to money or credentials', category: 'pressure', weight: 13,
    patterns: [/\b(urgent|immediately|right\s+now|within\s+\d+\s*(?:hours?|minutes?)|last\s+chance|final\s+reminder|today\s+only)\b[^.!\n]{0,70}\b(pay|transfer|click|approve|verify|share|confirm|act|link)\b/gi, /\b(pay|transfer|click|approve|verify|share)\b[^.!\n]{0,60}\b(urgently|immediately|right\s+now|before\s+(?:the\s+)?deadline)\b/gi, /\b(?:urgent|immediately)\b[\s\S]{0,65}\b(?:share|transfer|pay|approve|verify)\b/gi],
    detail: 'Time pressure is used to stop people from checking the request independently.',
  },
  {
    id: 'secrecy', label: 'Asks to keep the conversation secret', category: 'pressure', weight: 19,
    patterns: [/\b(keep|do\s*n[o']?t)\b[^.!\n]{0,35}\b(?:this|it|conversation)\b[^.!\n]{0,25}\b(secret|private|confidential)\b/gi, /\bdo\s*n[o']?t\s+(?:tell|inform|call|check\s+with)\b/gi],
    detail: 'A request for secrecy is intended to prevent a trusted person from spotting the scam.',
  },
  {
    id: 'impersonation_ask', label: 'Claims to be a known institution while asking for action', category: 'impersonation', weight: 22,
    patterns: [/\b(?:this\s+is|i\s+am\s+calling\s+from|team)\b[^.!\n]{0,35}\b(?:bank|rbi|income\s+tax|police|customs|technician|hr|managing\s+director)\b[^.!\n]{0,80}\b(pay|share|verify|click|transfer|confirm|install)\b/gi, /\b(?:from\s+)?(?:your\s+)?bank\b[^.!\n]{0,40}\b(?:blocked|suspended|frozen|expired)\b/gi],
    detail: 'Authority claims combined with a request for money or credentials need independent confirmation.',
  },
  {
    id: 'kyc_link', label: 'KYC or account update via an external link', category: 'credential_phishing', weight: 24,
    patterns: [/\b(?:kyc|account|verification)\b[^.!\n]{0,45}\b(update|renew|verify|complete)\b[^.!\n]{0,45}\b(link|website|portal|click)\b/gi, /\bclick\s+(?:on\s+)?(?:the\s+)?(?:below\s+)?link\b[^.!\n]{0,45}\b(?:verify|update|confirm|claim|login)\b/gi],
    detail: 'Legitimate KYC is completed in the official app or branch, not through a link in a message.',
  },
  {
    id: 'remote_access', label: 'Requests remote device access', category: 'tech_support', weight: 34,
    patterns: [/\b(anydesk|teamviewer|remote\s+access|remote\s+desktop|screen\s+sharing)\b/gi, /\b(install|download)\b[^.!\n]{0,35}\b(support\s+app|remote\s+(?:tool|app|software)|apk)\b/gi],
    detail: 'Remote access gives a stranger control of your device and banking apps.',
  },
  {
    id: 'qr_receive', label: 'QR code tied to a payment or PIN request', category: 'qr_scam', weight: 25,
    patterns: [/\b(scan|qr\s+code)\b[^.!\n]{0,60}\b(receive|refund|claim|payment|upi\s+pin|approve)\b/gi, /\b(?:upi\s+pin|collect\s+request)\b[^.!\n]{0,45}\b(receive|refund|credit)\b/gi],
    detail: 'Scanning a QR is usually paying, not receiving. A UPI PIN is never needed to receive money.',
  },
  {
    id: 'overpayment', label: 'Claims money was sent by mistake', category: 'upi_request', weight: 27,
    patterns: [/\b(wrong\s+account|by\s+mistake|accidentally\s+(?:credited|transferred|sent))\b[\s\S]{0,65}\b(return|refund|send\s+back|transfer)\b/gi, /\b(return|refund)\b[^.!\n]{0,35}\b(amount\s+(?:sent|credited)\s+by\s+mistake)\b/gi],
    detail: 'The "wrong transfer" story is often used to get you to send money to the scammer first.',
  },
  {
    id: 'delivery_charge', label: 'Up-front delivery or customs charge', category: 'delivery_refund', weight: 22,
    patterns: [/\b(delivery|customs|courier|shipping|handling)\b[^.!\n]{0,30}\b(charge|fee|amount|payment)\b/gi],
    detail: 'Unexpected parcels with a small payable "release" charge are a common trap.',
  },
  {
    id: 'job_too_good', label: 'Unrealistic work-from-home earnings', category: 'advance_fee_job', weight: 18,
    patterns: [/\b(work\s+from\s+home|part[-\s]?time)\b[^.!\n]{0,60}\b(earn|salary|pay)\b[^.!\n]{0,35}\b(per\s+(?:day|hour|week)|₹\s?\d{3,})\b/gi, /\b(earn\s+₹\s?\d{3,}\s*(?:per|a)\s*(?:day|hour))\b/gi],
    detail: 'Very high pay for vague work is frequently paired with a later "registration" charge.',
  },
  {
    id: 'payment_redirection', label: 'Payment details changed at the last moment', category: 'impersonation', weight: 27,
    patterns: [/\b(?:bank|account|payment|beneficiary)\b[^.!\n]{0,45}\b(?:details?|number)\b[^.!\n]{0,40}\b(?:changed|revised|updated|different)\b/gi, /\b(?:ignore|disregard)\b[^.!\n]{0,45}\b(?:earlier|previous|prior)\b[^.!\n]{0,60}\b(?:pay|approve|collect|request)\b/gi, /\bapprove\b[^.!\n]{0,35}\b(?:new|revised)\b[^.!\n]{0,20}\bcollect\s+request\b/gi],
    detail: 'Late changes to a payee or a new collect request are a common business-email compromise pattern; confirm by voice using a saved number.',
  },
  {
    id: 'phishing_page', label: 'Asks to confirm credentials on a web page', category: 'credential_phishing', weight: 18,
    patterns: [/\b(?:confirm|verify|re-enter|enter)\b[^.!\n]{0,50}\b(?:your\s+)?(?:password|credentials?|card\s+details?|cvv)\b[^.!\n]{0,35}\b(?:page|portal|form|site|link)\b/gi, /\bverification\s+(?:page|portal|form)\b[^.!\n]{0,45}\b(?:password|cvv|card|credentials?)\b/gi],
    detail: 'Credential entry on a page reached from a message is a phishing pattern, even when the page looks official.',
  },
  {
    id: 'tech_support', label: 'Unsolicited device-fault or technician claim', category: 'tech_support', weight: 30,
    patterns: [/\b(?:laptop|computer|device|system|phone)\b[^.!\n]{0,35}\b(?:infected|hacked|compromised)\b/gi, /\b(?:technician|support\s+(?:agent|person|team))\b[^.!\n]{0,45}\b(?:code|access|remote)\b/gi],
    detail: 'Unsolicited claims that a device is infected are used to convince people to share access codes or install remote tools.',
  },
  {
    id: 'campus_fee', label: 'Fee demanded for an internship, placement or scholarship', category: 'campus_fee', weight: 32,
    patterns: [/\b(?:internship|placement|scholarship|admission|seat|offer)\b[\s\S]{0,70}\b(?:registration|processing|activation|verification|confirmation|security)\s+(?:fee|charge|amount|deposit)\b/gi, /\b(?:registration|processing|verification|confirmation)\s+(?:fee|charge|amount)\b[^.!\n]{0,45}\b(?:internship|placement|scholarship|seat|offer)\b/gi, /\b(?:pay|transfer|send)\b[^.!\n]{0,35}\b(?:rs\.?|₹)\s?\d{2,}\b[\s\S]{0,70}\b(?:offer\s+letter|seat|joining|scholarship|internship)\b/gi],
    detail: 'Genuine placement cells, scholarships and internships do not ask students to pay to receive an offer or sanction order.',
  },
  {
    id: 'faculty_impersonation', label: 'Claims to be faculty or a campus official while asking for action', category: 'faculty_impersonation', weight: 28,
    patterns: [/\b(?:professor|hod|faculty|coordinator|warden|placement\s+(?:cell|officer|coordinator))\b[^.!\n]{0,60}\b(?:share|send|confirm|pay|transfer|verify)\b/gi, /\b(?:i\s+am|this\s+is)\b[^.!\n]{0,35}\b(?:professor|hod|faculty|warden|coordinator)\b[^.!\n]{0,70}\b(?:urgent|confidential|do\s+n[o']?t\s+tell|bank|aadhaar|otp)\b/gi, /\b(?:hod|professor|faculty|warden|coordinator)\b[^.!\n]{0,55}\b(?:aadhaar|pan|bank\s+details?|identity\s+proof|otp)\b/gi, /\b(?:professor|hod|faculty|coordinator|warden|placement\s+(?:cell|officer|coordinator))\b[\s\S]{0,90}\b(?:bank\s+details?|aadhaar|pan|otp|password|pay|transfer|share|confirm)\b/gi],
    detail: 'A stranger claiming to be a teacher or coordinator and asking for money, secrets or confidentiality is a classic campus impersonation pattern.',
  },
  {
    id: 'academic_portal', label: 'Academic portal login or password request', category: 'academic_portal', weight: 26,
    patterns: [/\b(?:academic|student|exam(?:ination)?|library|placement)\s+portal\b[^.!\n]{0,60}\b(?:login|password|re-?enter|verify|expired|suspended|update)\b/gi, /\b(?:re-?enter|confirm|verify)\b[^.!\n]{0,40}\b(?:college|student)\b[^.!\n]{0,20}\b(?:email|password|credentials|login)\b/gi],
    detail: 'Colleges do not ask students to email a password or OTP. Open the portal from the college website yourself.',
  },
  {
    id: 'event_registration', label: 'Up-front event or workshop registration charge', category: 'event_registration', weight: 24,
    patterns: [/\b(?:event|hackathon|fest|workshop|lecture|contest|conference)\b[\s\S]{0,90}\b(?:registration|entry|participation|confirmation)\s+(?:fee|charge|amount)\b/gi, /\b(?:pay|transfer)\b[^.!\n]{0,35}\b(?:rs\.?|₹)\s?\d{2,}\b[\s\S]{0,90}\b(?:event|fest|workshop|hackathon|seat|kit)\b/gi],
    detail: 'A genuine campus event publishes its registration terms on an official page; an unexplained personal fee is a warning sign.',
  },
  {
    id: 'hostel_advance', label: 'Hostel room or seat held for an advance payment', category: 'hostel_payment', weight: 28,
    patterns: [/\bhostel\b[^.!\n]{0,50}\b(?:advance|security\s+deposit|room\s+confirmation|seat\s+confirmation)\b/gi, /\b(?:warden|housing\s+office|hostel)\b[^.!\n]{0,55}\b(?:personal\s+account|upi\s+id|transfer|pay)\b/gi],
    detail: 'Hostel allotment and deposits are handled through the college office or official portal, not a personal account in a message.',
  },
  {
    id: 'campus_deadline', label: 'Campus deadline tied to money or credentials', category: 'pressure', weight: 12,
    patterns: [/\b(?:today\s+only|last\s+date|final\s+reminder|before\s+(?:the\s+)?deadline)\b[^.!\n]{0,60}\b(?:pay|fee|share|confirm|transfer|otp)\b/gi, /\b(?:pay|share|transfer)\b[^.!\n]{0,50}\b(?:before\s+\d{1,2}\s?(?:pm|am)|today\s+only)\b/gi],
    detail: 'A short deadline is often used to stop a student from checking with the placement cell or family.',
  },
  {
    id: 'channel_mismatch', label: 'Official channel replaced by a personal contact', category: 'faculty_impersonation', weight: 28,
    patterns: [/\b(?:official|college|campus)\s+(?:portal|website)\b[^.!\n]{0,45}\b(?:down|not\s+working|unavailable|closed)\b/gi, /\bpersonal\s+(?:upi|account|number)\b/gi, /\b(?:transfer|pay|send)\b[^.!\n]{0,50}\b(?:fee|amount)\b[^.!\n]{0,35}\bpersonal\s+(?:account|upi)\b/gi],
    detail: 'A message that moves a college process away from the official portal to a personal number or account needs independent confirmation.',
  },
  {
    id: 'link_ask', label: 'Directs the reader to a link or attachment', category: 'phishing', weight: 9,
    patterns: [/\b(click|open|visit|tap)\b[^.!\n]{0,20}\b(link|below|attached|here)\b/gi],
    detail: 'Opening unknown links or attachments can lead to a credential-harvesting page.',
  },
];

export const SAFETY_SIGNALS = [
  { id: 'never_ask', re: /\b(?:we|i)\s+(?:will\s+)?never\s+(?:ask|share|send)\b|\b(?:bank|company)\s+never\s+asks?\b/gi, points: 7, detail: 'Message explicitly states that credentials are never requested.' },
  { id: 'do_not_share', re: /\bdo\s*n[o']?t\s+(?:share|give|enter)\s+(?:your\s+)?(?:otp|pin|password|cvv)\b/gi, points: 7, detail: 'Message warns against sharing credentials — consistent with legitimate guidance.' },
  { id: 'no_fee', re: /\bno\s+(?:fee|charge|payment|cost)\b|\b(?:fee|charges?)\s+(?:is\s+)?waived\b/gi, points: 6, detail: 'Message explicitly says no fee is charged.' },
  { id: 'already_paid', re: /\b(?:already\s+paid|refund\s+(?:has\s+been\s+)?initiated|credited\s+(?:to|in)\s+your\s+account)\b/gi, points: 5, detail: 'Describes a completed payment rather than asking for one.' },
  { id: 'no_approval_needed', re: /\b(?:do\s+not|no\s+need\s+to)\s+approve\b|\bno\s+payment\s+required\b/gi, points: 6, detail: 'Clarifies that no approval or payment is required from the recipient.' },
  { id: 'campus_official_channel', re: /\b(?:official\s+(?:college|placement|student|academic)\s+portal|placement\s+cell|college\s+website|official\s+event\s+portal)\b/gi, points: 5, detail: 'Directs the reader to an official campus channel rather than a private contact.' },
  { id: 'campus_no_fee', re: /\bno\s+(?:registration|application|processing|participation)\s+(?:fee|charge)\b/gi, points: 6, detail: 'Explicitly states that the campus opportunity has no fee.' },
  { id: 'published_notice', re: /\b(?:notice|circular|shortlist|results?)\b[^.!\n]{0,45}\b(?:published|available|uploaded)\b[^.!\n]{0,35}\b(?:website|portal)\b/gi, points: 5, detail: 'Refers to a notice published on an official portal rather than a private message.' },
];

export function detectRules(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { indicators: [], safetySignals: [], score: 0, categories: [] };
  }
  const indicators = [];
  for (const rule of RULES) {
    // Count the authentication request once when the same wording matches both rules.
    if (rule.id === 'otp_share' && indicators.some(({ id }) => id === 'code_handoff')) continue;
    let evidence = null;
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[0].length === 0) break;
        if (!negatedJustBefore(text, match.index)) {
          evidence = match[0].replace(/\s+/g, ' ').trim().slice(0, 100);
          break;
        }
      }
      if (evidence) break;
    }
    if (evidence) {
      indicators.push({
        id: rule.id, label: rule.label, detail: rule.detail,
        weight: rule.weight, category: rule.category, evidence,
      });
    }
  }
  const safetySignals = [];
  let reduction = 0;
  for (const signal of SAFETY_SIGNALS) {
    signal.re.lastIndex = 0;
    if (signal.re.test(text)) {
      reduction += signal.points;
      safetySignals.push({ id: signal.id, detail: signal.detail, points: signal.points });
    }
  }
  const vote = new Map();
  for (const indicator of indicators) vote.set(indicator.category, (vote.get(indicator.category) || 0) + indicator.weight);
  const categories = [...vote.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category);
  return {
    indicators,
    safetySignals,
    score: clamp(indicators.reduce((sum, i) => sum + i.weight, 0) - reduction, 0, 100),
    categories,
  };
}
