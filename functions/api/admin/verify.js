// GET /api/admin/verify
//
// Login exchange: validates the admin Bearer token and, on success, issues
// an HttpOnly session cookie that every other /api/admin/* endpoint accepts
// via checkAdminSession. The Bearer token is the user's typed secret — it
// MUST stay in the request that POSTed the login form and never end up in
// JS-readable storage. From here on, the browser sends the cookie
// automatically and JS cannot read it.

import {
  createAdminSession,
  buildSessionCookie,
  SESSION_TTL_MS
} from '../_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  // checkAdminBearer ran in admin/_middleware.js because the path
  // ('/api/admin/verify') is the LOGIN_FLOW_PATH; if we got here, the Bearer
  // token is correct. Now we mint a session.
  const session = await createAdminSession(env, request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Could not create session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const setCookie = buildSessionCookie(session.raw, {
    maxAgeSec: Math.floor(SESSION_TTL_MS / 1000)
  });

  return new Response(JSON.stringify({ ok: true, expires_at: session.expiresAt }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie
    }
  });
}
