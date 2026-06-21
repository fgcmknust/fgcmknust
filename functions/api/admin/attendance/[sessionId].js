// GET    /api/admin/attendance/:sessionId  — session details + records
// DELETE /api/admin/attendance/:sessionId  — delete session + its records

export async function onRequestGet({ env, params }) {
  const sessionId = String(params.sessionId || '').trim();
  if (!sessionId) return err(400, 'Missing session ID');

  const session = await env.DB.prepare(
    `SELECT id, label, event_id, opens_at, closes_at FROM attendance_sessions WHERE id = ?`
  ).bind(sessionId).first();

  if (!session) return err(404, 'Session not found');

  const { results } = await env.DB.prepare(
    `SELECT id, full_name, phone, member_id, marked_at
     FROM   attendance_records
     WHERE  session_id = ?
     ORDER  BY marked_at ASC`
  ).bind(sessionId).all();

  return Response.json({ session, records: results || [] });
}

export async function onRequestDelete({ env, params }) {
  const sessionId = String(params.sessionId || '').trim();
  if (!sessionId) return err(400, 'Missing session ID');

  // ON DELETE CASCADE in the schema removes records automatically
  await env.DB.prepare(
    `DELETE FROM attendance_sessions WHERE id = ?`
  ).bind(sessionId).run();

  return Response.json({ success: true });
}

function err(status, message) {
  return Response.json({ error: message }, { status });
}
