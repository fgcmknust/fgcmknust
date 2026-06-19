// Shared admin auth helpers.
//
// There are TWO ways an admin request can authenticate:
//
//   1. `Authorization: Bearer <ADMIN_TOKEN>` — the original model. Now used
//      ONLY for /api/admin/verify, the login exchange. The Bearer comes from
//      the user typing the token into the login page, never from JS-readable
//      browser storage.
//
//   2. `Cookie: fgcm_admin_session=<random>` — issued by /api/admin/verify on
//      successful Bearer compare. The cookie is HttpOnly + Secure +
//      SameSite=Strict, so it cannot be read by JS and cannot be sent on a
//      cross-site request. We store only its SHA-256 in D1 admin_sessions, so
//      a DB leak doesn't yield usable session tokens.
//
// Every other /api/admin/* endpoint requires (2). Even (1) doesn't accept the
// session cookie on its own — login MUST present the Bearer token explicitly.

const SESSION_COOKIE_NAME = 'fgcm_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export { SESSION_COOKIE_NAME, SESSION_TTL_MS };

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Used during the login exchange ONLY (POST/GET /api/admin/verify). Other
// admin endpoints must use checkAdminSession() so the Bearer never has to
// leave the server's secure environment.
export function checkAdminBearer(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } }) };
  }
  const header = request.headers.get('Authorization') || '';
  const expected = `Bearer ${token}`;
  if (!constantTimeEqual(header, expected)) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  return { ok: true };
}

// Legacy name retained as an alias so any older import still works.
export const checkAdminAuth = checkAdminBearer;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (k && !out[k]) out[k] = v;
  }
  return out;
}

async function sha256Hex(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a new admin session row and returns the raw cookie value that
 * the caller should send via Set-Cookie. The raw value is NEVER stored
 * in D1 — only its SHA-256.
 */
export async function createAdminSession(env, request) {
  const raw = randomHex(32);
  const hash = await sha256Hex(raw);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const ip = request.headers.get('CF-Connecting-IP') || null;
  const ua = (request.headers.get('User-Agent') || '').slice(0, 500);
  try {
    await env.DB.prepare(
      `INSERT INTO admin_sessions (session_hash, expires_at, created_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)`
    ).bind(hash, expiresAt, now, ip, ua).run();
  } catch (e) {
    console.error('Admin session insert failed', e);
    return null;
  }
  return { raw, expiresAt };
}

/**
 * Validates the request's session cookie. Returns { ok: true } if a row in
 * admin_sessions matches and hasn't expired; otherwise returns a 401 response.
 *
 * As a side effect, expired sessions present in the request are best-effort
 * deleted to keep the table tidy without a separate cron.
 */
export async function checkAdminSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw || typeof raw !== 'string' || raw.length < 32 || raw.length > 128) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  const hash = await sha256Hex(raw);
  let row;
  try {
    row = await env.DB.prepare(`SELECT expires_at FROM admin_sessions WHERE session_hash = ?`).bind(hash).first();
  } catch (e) {
    console.error('Admin session lookup failed', e);
    return { ok: false, response: new Response(JSON.stringify({ error: 'Auth backend unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) };
  }
  if (!row) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  if (Number(row.expires_at) <= Date.now()) {
    // Best-effort cleanup of the expired row.
    try { await env.DB.prepare(`DELETE FROM admin_sessions WHERE session_hash = ?`).bind(hash).run(); } catch (e) { /* ignore */ }
    return { ok: false, response: new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }
  return { ok: true };
}

/**
 * Removes the session row associated with the request's cookie. Idempotent.
 */
export async function destroyAdminSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return;
  const hash = await sha256Hex(raw);
  try {
    await env.DB.prepare(`DELETE FROM admin_sessions WHERE session_hash = ?`).bind(hash).run();
  } catch (e) { /* ignore */ }
}

/**
 * Build the Set-Cookie value to set (or clear) the session cookie.
 */
export function buildSessionCookie(value, { maxAgeSec, clear = false } = {}) {
  if (clear) {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  }
  const segments = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict'
  ];
  if (typeof maxAgeSec === 'number' && Number.isFinite(maxAgeSec)) {
    segments.push(`Max-Age=${Math.floor(maxAgeSec)}`);
  }
  return segments.join('; ');
}

export { constantTimeEqual };
