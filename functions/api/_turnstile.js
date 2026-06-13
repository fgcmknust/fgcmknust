// Cloudflare Turnstile server-side verification.
//
// Set `TURNSTILE_SECRET_KEY` and `TURNSTILE_SITE_KEY` via `wrangler secret put`
// (or in .dev.vars locally). If `TURNSTILE_SECRET_KEY` is not set, verification
// is skipped — this lets the site run in dev without Turnstile, but you should
// always set it in production.

import { getClientIp } from './_rate_limit.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileConfigured(env) {
  return !!(env && env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token, env, request) {
  if (!turnstileConfigured(env)) {
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    return { ok: false, error: 'Missing or invalid CAPTCHA token' };
  }

  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  const ip = request ? getClientIp(request) : null;
  if (ip && ip !== 'unknown') body.append('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = await res.json().catch(() => null);
    if (data && data.success === true) {
      return { ok: true };
    }
    const codes = (data && Array.isArray(data['error-codes'])) ? data['error-codes'] : [];
    console.warn('Turnstile verification failed', { codes });
    return { ok: false, error: 'CAPTCHA verification failed' };
  } catch (e) {
    console.error('Turnstile network error', e);
    return { ok: false, error: 'CAPTCHA verification unavailable' };
  }
}

export function captchaFailedResponse(reason) {
  return new Response(
    JSON.stringify({ error: reason || 'CAPTCHA verification failed' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
