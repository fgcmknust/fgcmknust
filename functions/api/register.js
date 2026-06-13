// POST /api/register
// Registers a new member in D1.

import { generateUUIDv7 } from './_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeString,
  isValidName, isOptionalName, isValidGender, isValidDepartment, isPlainText
} from './_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from './_rate_limit.js';
import { verifyTurnstile, captchaFailedResponse } from './_turnstile.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;

  const ip = getClientIp(request);
  const rl = await rateLimit(DB, `register:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const captcha = await verifyTurnstile(data && data.captchaToken, env, request);
  if (!captcha.ok) return captchaFailedResponse(captcha.error);

  const { first_name, middle_name, last_name, email, phone, gender, address, department } = data || {};

  if (!isValidName(first_name)) return Response.json({ error: 'Invalid first name' }, { status: 400 });
  if (!isOptionalName(middle_name)) return Response.json({ error: 'Invalid middle name' }, { status: 400 });
  if (!isValidName(last_name)) return Response.json({ error: 'Invalid last name' }, { status: 400 });
  if (!isValidEmail(email)) return Response.json({ error: 'Invalid email' }, { status: 400 });
  if (!isValidPhoneSimple(phone)) return Response.json({ error: 'Invalid phone number' }, { status: 400 });
  if (!isValidGender(gender)) return Response.json({ error: 'Invalid gender' }, { status: 400 });
  if (!isPlainText(address, { min: 3, max: 500 })) return Response.json({ error: 'Invalid address' }, { status: 400 });
  if (!isValidDepartment(department)) return Response.json({ error: 'Invalid department' }, { status: 400 });

  const id = generateUUIDv7();

  try {
    const result = await DB.prepare(`
      INSERT INTO members (id, first_name, middle_name, last_name, email, phone, gender, address, department)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      sanitizeString(first_name, 120),
      sanitizeString(middle_name, 120) || null,
      sanitizeString(last_name, 120),
      sanitizeString(email, 254),
      sanitizeString(phone, 32),
      sanitizeString(gender, 32),
      sanitizeString(address, 500),
      sanitizeString(department, 200)
    ).run();

    if (!result.success) throw new Error('Database insertion failed');
    return Response.json({ message: 'Registration successful', status: 'success' }, { status: 201 });
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE constraint')) {
      return Response.json({ error: 'A member with this email already exists.' }, { status: 409 });
    }
    throw err;
  }
}
