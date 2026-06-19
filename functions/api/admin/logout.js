// POST /api/admin/logout
//
// Server-side revocation: deletes the row associated with the caller's
// session cookie and asks the browser to clear it. Idempotent — calling
// logout while already logged-out succeeds quietly. No body required.

import { destroyAdminSession, buildSessionCookie } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  await destroyAdminSession(request, env);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie('', { clear: true })
    }
  });
}
