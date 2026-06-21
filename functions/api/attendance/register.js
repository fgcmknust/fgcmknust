// POST /api/attendance/register
// Registers a NEW member AND automatically marks their attendance.
// Used when someone scans the QR code and selects "I'm New Here".
// No Turnstile — this is an in-person, on-site action.
//
// Responses:
//   201 { success: true, name }          — registered + attendance marked
//   200 { already_member: true, hint }   — phone or email already in members DB
//   409 { error, device: true }          — device already marked for this session
//   409 { error }                        — phone already marked (edge case)
//   400/404 { error }                    — validation / session errors

import { generateUUIDv7 } from '../_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeString,
  isValidName, isOptionalName, isValidGender, isValidDepartment, isPlainText
} from '../_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const ip = getClientIp(request);
  const rl = await rateLimit(db, `att-register:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let data;
  try { data = await request.json(); }
  catch { return err(400, 'Invalid JSON'); }

  const { session_id, device_id,
          first_name, middle_name, last_name, email, phone,
          gender, date_of_birth, address, department } = data || {};

  // Validate session is active
  const sessionId = String(session_id || '').trim();
  if (!sessionId) return err(400, 'Missing session');

  const now = Math.floor(Date.now() / 1000);
  const session = await db.prepare(
    `SELECT id, opens_at, closes_at FROM attendance_sessions WHERE id = ?`
  ).bind(sessionId).first();

  if (!session)               return err(404, 'Session not found');
  if (now < session.opens_at) return err(400, 'Attendance window has not opened yet');
  if (now > session.closes_at) return err(400, 'Attendance window has closed');

  // Device check — same physical phone cannot mark for two people
  const deviceId = String(device_id || '').trim().substring(0, 128);
  if (deviceId) {
    const devUsed = await db.prepare(
      `SELECT id FROM attendance_records WHERE session_id = ? AND device_id = ?`
    ).bind(sessionId, deviceId).first();
    if (devUsed) return Response.json(
      { error: 'This device has already been used to mark attendance for this session', device: true },
      { status: 409 }
    );
  }

  // Validate all member fields (same rules as /api/register)
  if (!isValidName(first_name))     return err(400, 'Invalid first name');
  if (!isOptionalName(middle_name)) return err(400, 'Invalid middle name');
  if (!isValidName(last_name))      return err(400, 'Invalid last name');
  if (!isValidEmail(email))         return err(400, 'Invalid email address');
  if (!isValidPhoneSimple(phone))   return err(400, 'Invalid phone number');
  if (!isValidGender(gender))       return err(400, 'Please select a gender');
  if (!date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(String(date_of_birth)))
    return err(400, 'Invalid date of birth');
  if (!isPlainText(address, { min: 3, max: 500 })) return err(400, 'Invalid address');
  if (!isValidDepartment(department)) return err(400, 'Please select a department');

  const cleanPhone = sanitizeString(phone, 32);
  const cleanEmail = sanitizeString(email, 254);

  // DB check — phone or email already registered?
  const byPhone = await db.prepare(
    `SELECT id, first_name, last_name FROM members WHERE phone = ? LIMIT 1`
  ).bind(cleanPhone).first();
  if (byPhone) {
    return Response.json({
      already_member: true,
      name: `${byPhone.first_name} ${byPhone.last_name}`,
      hint: 'phone'   // tells frontend which field to highlight
    });
  }

  const byEmail = await db.prepare(
    `SELECT id FROM members WHERE email = ? LIMIT 1`
  ).bind(cleanEmail).first();
  if (byEmail) {
    return Response.json({ already_member: true, hint: 'email' });
  }

  // Edge case: phone somehow already in this session's records
  const alreadyMarked = await db.prepare(
    `SELECT id FROM attendance_records WHERE session_id = ? AND phone = ?`
  ).bind(sessionId, cleanPhone).first();
  if (alreadyMarked) return err(409, 'Attendance already marked for this phone number');

  // Create member
  const memberId = generateUUIDv7();
  await db.prepare(`
    INSERT INTO members
      (id, first_name, middle_name, last_name, email, phone, gender, date_of_birth, address, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    memberId,
    sanitizeString(first_name, 120),
    sanitizeString(middle_name, 120) || null,
    sanitizeString(last_name, 120),
    cleanEmail,
    cleanPhone,
    sanitizeString(gender, 32),
    String(date_of_birth),
    sanitizeString(address, 500),
    sanitizeString(department, 200)
  ).run();

  // Auto-mark attendance for the active session
  const fullName = `${sanitizeString(first_name, 120)} ${sanitizeString(last_name, 120)}`.trim();
  await db.prepare(
    `INSERT INTO attendance_records (id, session_id, member_id, full_name, phone, device_id, marked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(generateUUIDv7(), sessionId, memberId, fullName, cleanPhone, deviceId || null, now).run();

  return Response.json({ success: true, name: fullName }, { status: 201 });
}

function err(status, message) {
  return Response.json({ error: message }, { status });
}
