// POST /api/attendance/mark
// For EXISTING members only (phone must be in the members table).
// Body: { session_id, phone, device_id }
//
// Responses:
//   200 { success: true, name }      — attendance marked
//   200 { not_found: true }          — phone not in members → use /attendance/register
//   409 { error, device: true }      — this device already marked for this session
//   409 { error }                    — this phone already marked for this session
//   400/404 { error }                — validation / session errors

import { isValidPhoneSimple } from '../_validation.js';
import { generateUUIDv7 } from '../_utils.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = getClientIp(request);
  const rl = await rateLimit(env.DB, `attendance:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let data;
  try { data = await request.json(); }
  catch { return err(400, 'Invalid JSON'); }

  const phone     = String(data.phone      || '').trim();
  const sessionId = String(data.session_id || '').trim();
  const deviceId  = String(data.device_id  || '').trim().substring(0, 128);

  if (!isValidPhoneSimple(phone))           return err(400, 'Invalid phone number');
  if (!sessionId || sessionId.length > 128) return err(400, 'Missing session');

  const db  = env.DB;
  const now = Math.floor(Date.now() / 1000);

  const session = await db.prepare(
    `SELECT id, opens_at, closes_at FROM attendance_sessions WHERE id = ?`
  ).bind(sessionId).first();

  if (!session)               return err(404, 'Session not found');
  if (now < session.opens_at) return err(400, 'Attendance window has not opened yet');
  if (now > session.closes_at) return err(400, 'Attendance window has closed');

  // Device check — same physical phone cannot mark for two different people
  if (deviceId) {
    const devUsed = await db.prepare(
      `SELECT id FROM attendance_records WHERE session_id = ? AND device_id = ?`
    ).bind(sessionId, deviceId).first();
    if (devUsed) return Response.json(
      { error: 'This device has already been used to mark attendance for this session', device: true },
      { status: 409 }
    );
  }

  // Phone duplicate check
  const existing = await db.prepare(
    `SELECT id FROM attendance_records WHERE session_id = ? AND phone = ?`
  ).bind(sessionId, phone).first();
  if (existing) return err(409, 'Attendance already marked for this phone number');

  // Look up member — this endpoint is for existing members only
  const member = await db.prepare(
    `SELECT id, first_name, last_name FROM members WHERE phone = ? LIMIT 1`
  ).bind(phone).first();

  if (!member) {
    // Phone not registered — tell the frontend to use the new-member registration path
    return Response.json({ not_found: true });
  }

  const fullName = `${member.first_name} ${member.last_name}`.trim();

  await db.prepare(
    `INSERT INTO attendance_records (id, session_id, member_id, full_name, phone, device_id, marked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(generateUUIDv7(), sessionId, member.id, fullName, phone, deviceId || null, now).run();

  return Response.json({ success: true, name: fullName });
}

function err(status, message) {
  return Response.json({ error: message }, { status });
}
