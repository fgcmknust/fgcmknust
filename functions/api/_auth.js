// Shared admin auth helper with constant-time comparison

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function checkAdminAuth(request, env) {
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

export { constantTimeEqual };
