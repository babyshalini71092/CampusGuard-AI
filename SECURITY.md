# Security and privacy notes

## Data handling

- Message text, screenshots, OCR output and questionnaire answers are processed in the browser tab only. There is no analysis API, no database, no analytics, no account and no server-side log.
- No user input is written to localStorage, IndexedDB or a service worker cache by the application.
- The app never asks for OTPs, UPI PINs, passwords, CVVs, full card numbers or bank account numbers. If a user types them anyway, they remain in the textarea in that tab; users should clear the input.
- Closing the tab discards all session state. Browser-level caching of static model/OCR assets is outside the application's control and does not include user text.

## Application controls

| Area | Control |
|---|---|
| XSS | React escapes all text. No `dangerouslySetInnerHTML`, `eval`, `new Function` or inline user HTML is used. Downloaded reports are plain text with HTML metacharacters escaped. |
| Input size | Message text limited to 4,000 characters; image uploads limited to 5 MB and to PNG/JPEG/WebP. |
| Malformed input | Unicode NFKC normalisation, zero-width/control-character removal and safe homoglyph folding before matching; invalid strings return validation messages, not exceptions. |
| URLs | Parsed with the browser URL parser for lexical indicators only. No fetch, DNS lookup, redirect follow, iframe, `window.open` or automatic link activation. Official links are explicit, hard-coded `https://` addresses with `rel="noopener noreferrer"`. |
| Files | File type and size validated in the UI before OCR. OCR worker is pinned to local assets. Object URLs are revoked when replaced/unmounted. |
| Model | Static local ONNX files only; remote model downloads are disabled in the browser. Explicit states prevent claiming ML inference when the model failed. |
| Secrets | No API keys, tokens or credentials are present in source or configuration. |
| Error handling | Analysis errors surface as readable messages; model failure falls back to rules; OCR failure offers manual text entry. |

## Threat model and residual risks

- **Malicious pasted text:** treated as inert text throughout; regular-expression patterns are fixed in source (no user-supplied regex). A very long or unusual string can slow rule matching but is capped.
- **Malicious image:** decoded by the browser and Tesseract only; no server processing. Extremely large images are rejected by size; crafted images can still make OCR slow, and the user can cancel by navigating away.
- **Link deception:** lexical inspection is advisory. A domain without suspicious structure is not proven trustworthy.
- **Supply chain:** dependencies are pinned in `package-lock.json`; vendored model/runtime/OCR assets should be checksum-verified when redistributed.
- **Deployment:** serve over HTTPS from a trusted origin and add a restrictive Content-Security-Policy at the hosting layer if available. The Vite dev server intentionally allows preview hosts during development and is not a production server.
- **False assurance:** the tool always states that a low score is not proof of safety and that scores are heuristic, not calibrated probabilities.

## Reporting

Suspected student-targeted cybercrime in India: National Cyber Crime Reporting Portal https://cybercrime.gov.in (financial fraud category) and cybercrime helpline 1930. Verified on the official portal. Reporting helps authorities act; it does not guarantee recovery of funds. Students should also inform the placement cell, college administration/IT helpdesk or event organiser through independently verified contacts.
