/**
 * Input validation and safe normalization.
 * All processing is local; nothing here performs network requests.
 */
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g;
const HOMOGLYPHS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'h', 'у': 'y', 'і': 'i',
  'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'τ': 't', 'ω': 'w',
  'в': 'v', 'ж': 'zh', 'н': 'n', 'к': 'k', 'м': 'm', 'т': 't', 'б': 'b', 'г': 'g',
  'А': 'A', 'В': 'V', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
  'С': 'C', 'Т': 'T', 'У': 'Y', 'Х': 'X', 'Ж': 'Zh', 'І': 'I', 'Н': 'N',
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Normalize unicode lookalikes/control characters before rule matching. */
export function normalizeText(input) {
  if (typeof input !== 'string') throw new ValidationError('Message must be text.');
  let text = input.normalize('NFKC').replace(ZERO_WIDTH, '');
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
  text = text.replace(/[аеорсхуіѕԁɡορντωвжнкмтбгаАВЕКМНОРСТУХЖІ]/g, (ch) => HOMOGLYPHS[ch] || ch);
  return text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function validateMessage(raw, { maxLength = MAX_MESSAGE_LENGTH } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Enter a message to analyze.' };
  }
  const text = normalizeText(raw);
  if (!text) return { ok: false, error: 'Message contains no readable text.' };
  if (text.length > maxLength) {
    return { ok: false, error: `Message is too long (${text.length}/${maxLength} characters).` };
  }
  return { ok: true, text };
}

export function validateImage(file) {
  if (!file || typeof file !== 'object' || typeof file.size !== 'number') {
    return { ok: false, error: 'Choose an image file to scan.' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes((file.type || '').toLowerCase())) {
    return { ok: false, error: 'Unsupported format. Use a PNG, JPEG or WebP screenshot.' };
  }
  if (file.size === 0) return { ok: false, error: 'This file is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image is larger than 5 MB. Please use a smaller screenshot.' };
  }
  return { ok: true, file };
}

/** Defense in depth: strip anything that could be interpreted as markup. */
export function escapeForReport(text) {
  return normalizeText(text).replace(/[<>&"']/g, (ch) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}
