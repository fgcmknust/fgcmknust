// Validation and sanitization helpers for server-side endpoints.

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

// Phone validation:
// - strip whitespace, dashes, brackets, plus
// - reject if too short / too long for E.164
// - reject if the first non-zero digit doesn't look like a country/national
//   prefix (avoids accepting strings like "000000000")
// - all-zero / all-same-digit numbers are rejected
export function isValidPhoneSimple(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()+]/g, '');
  if (!/^\d{9,15}$/.test(cleaned)) return false;
  // Reject N-of-the-same-digit (e.g. 0000000000, 9999999999).
  if (/^(\d)\1+$/.test(cleaned)) return false;
  // After dropping any leading zero(s), require at least 8 meaningful digits.
  const trimmed = cleaned.replace(/^0+/, '');
  if (trimmed.length < 8) return false;
  return true;
}

// Allow letters from any language, plus spaces, apostrophes, hyphens, and dots.
// Disallows digits and angle brackets / control chars.
const NAME_RE = /^[\p{L}][\p{L}\s'\-\.]{0,119}$/u;

export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 120) return false;
  return NAME_RE.test(trimmed);
}

export function isOptionalName(name) {
  if (name === undefined || name === null || name === '') return true;
  return isValidName(name);
}

export function sanitizeString(input, maxLen = 1000) {
  if (input === null || input === undefined) return null;
  // Strip ASCII control chars (0x00-0x1F, 0x7F) which have no legitimate use
  // in form input and can break log parsing or terminal display.
  let s = String(input);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 32 || code === 127) continue;
    out += s[i];
  }
  out = out.trim();
  if (out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

export function parsePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100) / 100;
}

export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 400) return false;
  try {
    if (url.startsWith('/')) {
      // No traversal or scheme-relative trickery.
      if (url.includes('..') || url.startsWith('//')) return false;
      return true;
    }
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
}

export function sanitizeItemsArray(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map(it => ({
    id: sanitizeString(it && it.id, 128),
    size: sanitizeString(it && it.size, 32),
    color: sanitizeString(it && it.color, 64),
    quantity: Math.max(1, Math.min(50, Math.floor(Number(it && it.quantity) || 1)))
  })).filter(i => i.id);
}

export function isValidReference(ref) {
  if (!ref || typeof ref !== 'string') return false;
  return /^[A-Za-z0-9_\-]{6,128}$/.test(ref);
}

const ALLOWED_GENDERS = new Set(['Male', 'Female']);
export function isValidGender(g) {
  return typeof g === 'string' && ALLOWED_GENDERS.has(g);
}

const ALLOWED_DEPARTMENTS = new Set([
  'Choir', 'Ushering', 'Media', 'Prayer', 'Evangelism', 'Follow-up', 'Drama'
]);
export function isValidDepartment(d) {
  return typeof d === 'string' && ALLOWED_DEPARTMENTS.has(d);
}

const ALLOWED_EVENT_CATEGORIES = new Set([
  'Service', 'Youth', 'Outreach', 'Teaching', 'Social', 'Special', 'General'
]);
export function isValidEventCategory(c) {
  return typeof c === 'string' && ALLOWED_EVENT_CATEGORIES.has(c);
}

const ALLOWED_PRODUCT_CATEGORIES = new Set([
  'T-Shirts', 'Hoodies', 'Accessories', 'Books', 'Uncategorized'
]);
export function isValidProductCategory(c) {
  return typeof c === 'string' && ALLOWED_PRODUCT_CATEGORIES.has(c);
}

const ALLOWED_EVENT_STATUSES = new Set(['confirmed', 'cancelled', 'tentative', 'anticipatory']);
export function isValidEventStatus(s) {
  return typeof s === 'string' && ALLOWED_EVENT_STATUSES.has(s);
}

export function isPlainText(value, { min = 1, max = 2000 } = {}) {
  if (typeof value !== 'string') return false;
  if (value.length < min || value.length > max) return false;
  // Disallow obvious tag injection at the boundary.
  if (/<\s*\/?\s*script\b/i.test(value)) return false;
  return true;
}
