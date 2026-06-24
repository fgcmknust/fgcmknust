// POST /api/nominations — submit a self-nomination

import { generateUUIDv7 } from '../_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeString, isValidName, isOptionalName, isPlainText
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

  const {
    nominator_name,
    nominee_first_name,
    nominee_middle_name,
    nominee_last_name,
    nominee_phone,
    nominee_email,
    role,
    statement,
  } = data || {};

  if (!isOptionalName(nominator_name))      return err(400, 'Invalid nominator name');
  if (!isValidName(nominee_first_name))     return err(400, 'Invalid nominee first name');
  if (nominee_middle_name && !isValidName(nominee_middle_name)) return err(400, 'Invalid nominee middle name');
  if (!isValidName(nominee_last_name))      return err(400, 'Invalid nominee last name');
  if (!isValidPhoneSimple(nominee_phone))   return err(400, 'Invalid nominee phone number');
  if (!isValidEmail(nominee_email))         return err(400, 'Invalid nominee email address');
  if (!role || !VALID_ROLES.has(String(role))) return err(400, 'Please select a valid role');
  if (!isPlainText(statement, { min: 20, max: 500 }))
    return err(400, 'Please provide a suitability statement (20–500 characters)');

  const cleanPhone     = sanitizeString(nominee_phone, 32);
  const cleanEmail     = sanitizeString(nominee_email, 254);
  const cleanStatement = sanitizeString(statement, 500);

  const existing = await db.prepare(
    `SELECT id FROM nominations WHERE nominee_phone = ? AND role = ? LIMIT 1`
  ).bind(cleanPhone, String(role)).first();
  if (existing) {
    return Response.json(
      { duplicate: true, error: 'This nominee has already been nominated for this role.' }
    );
  }

  await db.prepare(
    `INSERT INTO nominations (id, nominator_name, nominee_first_name, nominee_middle_name, nominee_last_name, nominee_phone, nominee_email, role, statement, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    generateUUIDv7(),
    sanitizeString(nominator_name, 120) || null,
    sanitizeString(nominee_first_name, 120),
    sanitizeString(nominee_middle_name, 120) || null,
    sanitizeString(nominee_last_name, 120),
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
