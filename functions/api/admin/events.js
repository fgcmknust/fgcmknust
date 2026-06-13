import { generateUUIDv7 } from '../_utils.js';
import {
  sanitizeString, isValidImageUrl,
  isValidEventCategory, isValidEventStatus, isPlainText
} from '../_validation.js';

function parsePayload(data) {
  const title = sanitizeString(data.title, 300);
  const date = sanitizeString(data.date, 50) || null;
  const time = sanitizeString(data.time, 50) || null;
  const venue = sanitizeString(data.venue, 300) || null;
  const description = sanitizeString(data.description, 2000);
  const image = sanitizeString(data.image, 400);
  const rawCategory = sanitizeString(data.category, 100) || 'General';
  const category = isValidEventCategory(rawCategory) ? rawCategory : 'General';
  const eventStatus = isValidEventStatus(data.eventStatus) ? data.eventStatus : 'confirmed';
  const isFeatured = data.isFeatured ? 1 : 0;
  const isSpecial = data.isSpecial ? 1 : 0;
  return { title, date, time, venue, description, image, category, eventStatus, isFeatured, isSpecial };
}

function validatePayload(p) {
  if (!p.title || !isPlainText(p.title, { min: 1, max: 300 })) return 'Invalid title';
  if (!p.description || !isPlainText(p.description, { min: 1, max: 2000 })) return 'Invalid description';
  if (!p.image || !isValidImageUrl(p.image)) return 'Invalid image';
  if (p.venue && !isPlainText(p.venue, { min: 1, max: 300 })) return 'Invalid venue';
  if (p.time && !isPlainText(p.time, { min: 1, max: 50 })) return 'Invalid time';
  if (p.date && p.date.length > 50) return 'Invalid date';
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const id = sanitizeString(data.id, 128) || generateUUIDv7();
    const payload = parsePayload(data);
    const err = validatePayload(payload);
    if (err) return new Response(JSON.stringify({ error: err }), { status: 400 });

    await env.DB.prepare(
      `INSERT INTO events (id, title, date, time, venue, description, image_url, category, is_featured, is_special, event_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, payload.title, payload.date, payload.time, payload.venue, payload.description,
      payload.image, payload.category, payload.isFeatured, payload.isSpecial, payload.eventStatus
    ).run();

    return new Response(JSON.stringify({ success: true, id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin event create failed', error);
    return new Response(JSON.stringify({ error: 'Failed to create event' }), { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const id = sanitizeString(data.id, 128);
    if (!id) return new Response(JSON.stringify({ error: 'ID required for update' }), { status: 400 });

    const payload = parsePayload(data);
    const err = validatePayload(payload);
    if (err) return new Response(JSON.stringify({ error: err }), { status: 400 });

    await env.DB.prepare(
      `UPDATE events SET title = ?, date = ?, time = ?, venue = ?, description = ?, image_url = ?, category = ?, is_featured = ?, is_special = ?, event_status = ? WHERE id = ?`
    ).bind(
      payload.title, payload.date, payload.time, payload.venue, payload.description,
      payload.image, payload.category, payload.isFeatured, payload.isSpecial, payload.eventStatus, id
    ).run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin event update failed', error);
    return new Response(JSON.stringify({ error: 'Failed to update event' }), { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = sanitizeString(url.searchParams.get('id'), 128);
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  try {
    await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin event delete failed', error);
    return new Response(JSON.stringify({ error: 'Failed to delete event' }), { status: 500 });
  }
}
