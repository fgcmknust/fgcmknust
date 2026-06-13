import { generateUUIDv7 } from '../_utils.js';
import {
  sanitizeString, parsePrice, isValidImageUrl,
  isValidProductCategory, isPlainText
} from '../_validation.js';

function parsePayload(data) {
  const name = sanitizeString(data.name, 200);
  const description = sanitizeString(data.description, 2000);
  const image = sanitizeString(data.image, 400);
  const rawCategory = sanitizeString(data.category, 100) || 'Uncategorized';
  const category = isValidProductCategory(rawCategory) ? rawCategory : 'Uncategorized';
  const price = parsePrice(data.price);
  const sizes = Array.isArray(data.sizes)
    ? data.sizes.slice(0, 20).map(s => sanitizeString(s, 32)).filter(Boolean)
    : [];
  const sizesJson = JSON.stringify(sizes);
  const isFeatured = data.isFeatured ? 1 : 0;
  return { name, description, image, category, price, sizesJson, isFeatured };
}

function validatePayload(p) {
  if (!p.name || !isPlainText(p.name, { min: 1, max: 200 })) return 'Invalid name';
  if (!p.description || !isPlainText(p.description, { min: 1, max: 2000 })) return 'Invalid description';
  if (!p.image || !isValidImageUrl(p.image)) return 'Invalid image';
  if (p.price === null) return 'Invalid price';
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
      `INSERT INTO products (id, name, price, description, image_url, sizes_json, category, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, payload.name, payload.price, payload.description, payload.image,
      payload.sizesJson, payload.category, payload.isFeatured
    ).run();

    return new Response(JSON.stringify({ success: true, id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin product create failed', error);
    return new Response(JSON.stringify({ error: 'Failed to create product' }), { status: 500 });
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
      `UPDATE products SET name = ?, price = ?, description = ?, image_url = ?, sizes_json = ?, category = ?, is_featured = ? WHERE id = ?`
    ).bind(
      payload.name, payload.price, payload.description, payload.image,
      payload.sizesJson, payload.category, payload.isFeatured, id
    ).run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin product update failed', error);
    return new Response(JSON.stringify({ error: 'Failed to update product' }), { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = sanitizeString(url.searchParams.get('id'), 128);
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  try {
    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin product delete failed', error);
    return new Response(JSON.stringify({ error: 'Failed to delete product' }), { status: 500 });
  }
}
