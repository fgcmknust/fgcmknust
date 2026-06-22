// POST /api/nominations — submit a self-nomination

import { generateUUIDv7 } from '../_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeString, isValidName, isPlainText
} from '../_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';

const VALID_ROLES = new Set([
  'President',
  'Vice President',
  'General Secretary',
  'Financial Secretary',
  'Prayer Secretary',
  'Assistant Prayer Secretary',
  'Organising Secretary',
  'Assistant Organising Secretary',
  'Evangelism Secretary',
  'Music Director',
  'Assistant Music Director',
  'Media and Publicity Head',
  'Assistant Media and Publicity Head',
  "Men's Wing",
  "Women's Wing",
  'Agape Head',
  'Visitors Head',
  'Bible Studies Head',
  'Ushering Head',
  'Assistant Ushering Head',
]);

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const ip = getClientIp(request);
  const rl = await rateLimit(db, `nominations:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let data;
  try { data = await request.json(); }
  catch { return err(400, 'Invalid JSON'); }

  const { first_name, middle_name, last_name, phone, email, role, statement } = data || {};

  if (!isValidName(first_name))   return err(400, 'Invalid first name');
  if (middle_name && !isValidName(middle_name)) return err(400, 'Invalid middle name');
  if (!isValidName(last_name))    return err(400, 'Invalid last name');
  if (!isValidPhoneSimple(phone)) return err(400, 'Invalid phone number');
  if (!isValidEmail(email))       return err(400, 'Invalid email address');
  if (!role || !VALID_ROLES.has(String(role))) return err(400, 'Please select a valid role');
  if (!isPlainText(statement, { min: 20, max: 500 }))
    return err(400, 'Please provide a suitability statement (20–500 characters)');

  const cleanPhone     = sanitizeString(phone, 32);
  const cleanEmail     = sanitizeString(email, 254);
  const cleanStatement = sanitizeString(statement, 500);

  const existing = await db.prepare(
    `SELECT id FROM nominations WHERE phone = ? AND role = ? LIMIT 1`
  ).bind(cleanPhone, String(role)).first();
  if (existing) {
    return Response.json(
      { duplicate: true, error: 'You have already submitted a nomination for this role.' }
    );
  }

  await db.prepare(
    `INSERT INTO nominations (id, first_name, middle_name, last_name, phone, email, role, statement, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    generateUUIDv7(),
    sanitizeString(first_name, 120),
    sanitizeString(middle_name, 120) || null,
    sanitizeString(last_name, 120),
    cleanPhone,
    cleanEmail,
    String(role),
    cleanStatement,
    Math.floor(Date.now() / 1000)
  ).run();

  return Response.json({ success: true }, { status: 201 });
}

function err(status, message) {
  return Response.json({ error: message }, { status });
}
