/**
 * Client-side validators that mirror the server-side rules in
 * `functions/api/_validation.js`. Each validator returns either `null`
 * (valid) or a short, user-facing error string.
 *
 * `attachValidation(form, rules)` wires every named field to its rule and
 * shows inline errors on blur / input / submit.
 */

const NAME_RE = /^[\p{L}][\p{L}\s'\-\.]{0,119}$/u;
const PHONE_RE = /^(\+233|0)\d{9}$/;

export function sanitizeInputString(str, maxLen = 1000) {
  if (str === null || str === undefined) return '';
  let s = String(str);
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

export const Validators = {
  required(value) {
    if (value === undefined || value === null) return 'This field is required';
    const s = String(value).trim();
    return s.length === 0 ? 'This field is required' : null;
  },

  name(value) {
    const s = sanitizeInputString(value, 120);
    if (!s) return 'Required';
    if (s.length < 2) return 'Must be at least 2 characters';
    if (!NAME_RE.test(s)) return 'Only letters, spaces, hyphens, apostrophes and dots are allowed';
    return null;
  },

  optionalName(value) {
    if (!value || !String(value).trim()) return null;
    return Validators.name(value);
  },

  email(value) {
    const s = sanitizeInputString(value, 254);
    if (!s) return 'Required';
    if (s.length > 254) return 'Email is too long';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Enter a valid email address';
    return null;
  },

  phoneGhana(value) {
    const s = sanitizeInputString(value, 32).replace(/[\s-]/g, '');
    if (!s) return 'Required';
    if (!PHONE_RE.test(s)) return 'Enter a valid Ghanaian phone number (e.g. 0551234567)';
    return null;
  },

  phoneInternational(value) {
    const s = sanitizeInputString(value, 32).replace(/[\s\-()+]/g, '');
    if (!s) return 'Required';
    if (!/^\d{9,15}$/.test(s)) return 'Enter a valid phone number';
    return null;
  },

  address(value) {
    const s = sanitizeInputString(value, 500);
    if (!s) return 'Required';
    if (s.length < 3) return 'Address is too short';
    if (/<\s*script\b/i.test(s)) return 'Invalid characters';
    return null;
  },

  oneOf(allowed) {
    return (value) => allowed.includes(String(value || '')) ? null : 'Please choose a valid option';
  },

  text({ min = 1, max = 2000 } = {}) {
    return (value) => {
      const s = sanitizeInputString(value, max);
      if (!s || s.length < min) return `Must be at least ${min} characters`;
      if (/<\s*script\b/i.test(s)) return 'Invalid characters';
      return null;
    };
  },

  positiveNumber({ min = 0, max = 1_000_000 } = {}) {
    return (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return 'Enter a number';
      if (n < min) return `Must be at least ${min}`;
      if (n > max) return `Must be at most ${max}`;
      return null;
    };
  },

  quantity({ min = 1, max = 50 } = {}) {
    return (value) => {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n)) return 'Enter a quantity';
      if (n < min) return `Must be at least ${min}`;
      if (n > max) return `Must be at most ${max}`;
      return null;
    };
  },

  isoDate(value) {
    const s = String(value || '');
    if (!s) return 'Required';
    if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) return 'Enter a valid date';
    const d = new Date(s);
    if (isNaN(d.getTime())) return 'Enter a valid date';
    return null;
  },

  date(value) {
    const s = String(value || '').trim();
    if (!s) return 'Date of birth is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Enter a valid date';
    const d = new Date(s + 'T00:00:00Z');
    if (isNaN(d.getTime())) return 'Enter a valid date';
    return null;
  }
};

function errorEl(input) {
  let el = input.parentElement && input.parentElement.querySelector(':scope > .field-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'field-error text-small';
    el.style.cssText = 'color: var(--color-error, #dc3545); margin: 0.25rem 0 0 0; min-height: 1em; font-size: 0.85rem;';
    (input.parentElement || input).appendChild(el);
  }
  return el;
}

function setError(input, message) {
  const el = errorEl(input);
  el.textContent = message || '';
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (message) {
    input.style.borderColor = 'var(--color-error, #dc3545)';
  } else {
    input.style.borderColor = '';
  }
}

/**
 * Wire field validators.
 *
 * @param {HTMLFormElement} form
 * @param {Record<string, (value: any) => string | null>} rules - keyed by input name OR id
 * @returns {{ validateAll: () => boolean, getValues: () => Record<string, string> }}
 */
export function attachValidation(form, rules) {
  if (!form) return { validateAll: () => true, getValues: () => ({}) };

  const lookup = (key) => form.querySelector(`[name="${key}"]`) || form.querySelector(`#${CSS.escape(key)}`);

  const fields = Object.entries(rules)
    .map(([key, rule]) => [key, lookup(key), rule])
    .filter(([, input]) => !!input);

  for (const [, input, rule] of fields) {
    const handler = () => {
      const value = input.value;
      const error = rule(value);
      setError(input, error);
    };
    input.addEventListener('blur', handler);
    input.addEventListener('input', () => setError(input, '')); // clear while typing
    input.addEventListener('change', handler);
  }

  function validateAll() {
    let allOk = true;
    for (const [, input, rule] of fields) {
      const value = input.value;
      const error = rule(value);
      setError(input, error);
      if (error) allOk = false;
    }
    if (!allOk) {
      const firstBad = fields.find(([, i]) => i.getAttribute('aria-invalid') === 'true');
      if (firstBad && firstBad[1] && typeof firstBad[1].focus === 'function') firstBad[1].focus();
    }
    return allOk;
  }

  function getValues() {
    const out = {};
    for (const [key, input] of fields) {
      out[key] = sanitizeInputString(input.value, 5000);
    }
    return out;
  }

  return { validateAll, getValues };
}
