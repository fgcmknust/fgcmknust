// POST /api/register-event
// Registers a user for a specific event.

import { generateUUIDv7 } from './_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeString,
  isValidName, isOptionalName
} from './_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from './_rate_limit.js';
import { verifyTurnstile, captchaFailedResponse } from './_turnstile.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;

  const ip = getClientIp(request);
  const rl = await rateLimit(DB, `register-event:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const captcha = await verifyTurnstile(data && data.captchaToken, env, request);
  if (!captcha.ok) return captchaFailedResponse(captcha.error);

  const { event_id, event_name, first_name, middle_name, last_name, email, phone } = data || {};

  if (typeof event_id !== 'string' || event_id.length === 0 || event_id.length > 128) {
    return Response.json({ error: 'Invalid event' }, { status: 400 });
  }
  if (!isValidName(first_name)) return Response.json({ error: 'Invalid first name' }, { status: 400 });
  if (!isOptionalName(middle_name)) return Response.json({ error: 'Invalid middle name' }, { status: 400 });
  if (!isValidName(last_name)) return Response.json({ error: 'Invalid last name' }, { status: 400 });
  if (!isValidEmail(email)) return Response.json({ error: 'Invalid email' }, { status: 400 });
  if (!isValidPhoneSimple(phone)) return Response.json({ error: 'Invalid phone number' }, { status: 400 });

  // Verify the event actually exists before inserting.
  const evRow = await DB.prepare('SELECT id FROM events WHERE id = ?').bind(sanitizeString(event_id, 128)).first();
  if (!evRow) return Response.json({ error: 'Unknown event' }, { status: 400 });

  const id = generateUUIDv7();
  try {
    const result = await DB.prepare(`
      INSERT INTO event_registrations (id, event_id, event_name, first_name, middle_name, last_name, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      sanitizeString(event_id, 128),
      sanitizeString(event_name, 256) || null,
      sanitizeString(first_name, 120),
      sanitizeString(middle_name, 120) || null,
      sanitizeString(last_name, 120),
      sanitizeString(email, 254),
      sanitizeString(phone, 32)
    ).run();

    if (!result.success) throw new Error('Database insertion failed');
    return Response.json({ message: 'Event registration successful', status: 'success' }, { status: 201 });
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE constraint')) {
      return Response.json({ error: 'You are already registered for this event with this email.' }, { status: 409 });
    }
    throw err;
  }
}
