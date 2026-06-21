// GET  /api/admin/attendance  — list sessions with record counts
// POST /api/admin/attendance  — create a new session
// Protected by functions/api/admin/_middleware.js

import { generateUUIDv7 } from '../../_utils.js';
import { sanitizeString } from '../../_validation.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT s.id, s.label, s.event_id, s.opens_at, s.closes_at, s.created_at,
           COUNT(r.id) AS record_count
    FROM   attendance_sessions s
    LEFT JOIN attendance_records r ON r.session_id = s.id
    GROUP BY s.id
    ORDER BY s.opens_at DESC
    LIMIT 200
  `).all();

  return Response.json(results || []);
}

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); }
  catch { return err(400, 'Invalid JSON'); }

  const label     = sanitizeString(String(data.label || '').trim(), 200);
  const event_id  = data.event_id ? String(data.event_id).trim().substring(0, 128) : null;
  const opens_at  = parseInt(data.opens_at,  10);
  const closes_at = parseInt(data.closes_at, 10);

  if (!label)                                return err(400, 'Label is required');
  if (!opens_at || !closes_at || isNaN(opens_at) || isNaN(closes_at))
    return err(400, 'Invalid time window');
  if (closes_at <= opens_at)                 return err(400, 'End time must be after start time');

  const id  = generateUUIDv7();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO attendance_sessions (id, label, event_id, opens_at, closes_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, label, event_id, opens_at, closes_at, now).run();

  return Response.json({ success: true, id });
}

function err(status, message) {
  return Response.json({ error: message }, { status });
}
