// GET /api/attendance/active
// Returns the currently open attendance session, or { active: false }.
// Public — no auth required.

export async function onRequestGet({ env }) {
  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB.prepare(
    `SELECT id, label, event_id, opens_at, closes_at
     FROM attendance_sessions
     WHERE opens_at <= ? AND closes_at >= ?
     ORDER BY opens_at DESC LIMIT 1`
  ).bind(now, now).first();

  return Response.json(session ? { active: true, session } : { active: false });
}
