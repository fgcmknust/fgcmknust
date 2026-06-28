// POST /api/pay/manual-confirm
//
// Customer-facing manual-payment confirmation. Accepts multipart/form-data:
//   - proof: image file (MoMo screenshot, JPG/PNG/WEBP/GIF, max 8 MB)
//   - data:  JSON string with { first_name, middle_name, last_name, email,
//                              phone, items, captchaToken }
//
// We:
//   1. Rate-limit by IP (cheap deterrent against upload floods)
//   2. Verify the Turnstile token (if configured)
//   3. Recompute the cart price server-side — never trust client amount
//   4. Stream the screenshot to R2 under uploads/payments/<uuid>.<ext>
//   5. Insert a purchases row with status='awaiting_review' and
//      payment_method='manual_momo' so it can later be verified and marked paid.

import { generateUUIDv7 } from '../_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeItemsArray, sanitizeString,
  isValidName, isOptionalName
} from '../_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';
import { verifyTurnstile, captchaFailedResponse } from '../_turnstile.js';
import { assertImageFile } from '../_magic_bytes.js';
// computeChargeBreakdown intentionally NOT imported here — the manual MoMo
// flow charges the raw cart subtotal only (no processing fee), so the amount
// stored in `purchases.amount` is exactly what the customer paid via MoMo.

const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const EXT_TO_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', webp: 'image/webp'
};

function generateReference() {
  // Same shape as the online-gateway references so downstream tooling can treat
  // them uniformly.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `FGCM_MOMO_${hex.toUpperCase()}`;
}

async function priceCart(DB, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Cart is empty' };
  }
  const MAX_QTY = 50;
  const qtyById = new Map();
  for (const it of items) {
    const id = sanitizeString(it.id, 128);
    let qty = Number(it.quantity);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    qty = Math.min(Math.floor(qty), MAX_QTY);
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  const ids = [...qtyById.keys()];
  if (ids.length === 0) return { ok: false, error: 'Cart has no valid items' };

  const placeholders = ids.map(() => '?').join(',');
  const { results } = await DB.prepare(
    `SELECT id, price FROM products WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  const priceById = new Map((results || []).map(r => [r.id, Number(r.price)]));
  const unknownIds = [];
  let total = 0;
  for (const id of ids) {
    const price = priceById.get(id);
    if (price === undefined || !Number.isFinite(price) || price < 0) {
      unknownIds.push(id);
      continue;
    }
    total += price * qtyById.get(id);
  }
  if (unknownIds.length > 0) {
    // Product IDs aren't sensitive — keeping this as a noisy warn is fine
    // because it's the only signal we have that prod DB is missing rows the
    // cart references.
    console.warn('priceCart: unknown product ids', JSON.stringify(unknownIds));
    return {
      ok: false,
      error: 'One or more items in your cart are no longer available. Please return to your cart and try again.',
      code: 'STALE_CART'
    };
  }
  total = Math.round(total * 100) / 100;
  if (total <= 0) return { ok: false, error: 'Computed cart total is zero' };
  return { ok: true, total };
}

function badRequest(error, status = 400, extra = {}) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;

  // ---- Rate limit -----------------------------------------------------------
  const ip = getClientIp(request);
  const rl = await rateLimit(DB, `pay-manual:${ip}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  // ---- Parse multipart ------------------------------------------------------
  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return badRequest('Invalid form data');
  }

  const proof = formData.get('proof');
  const dataRaw = formData.get('data');

  if (!proof || typeof proof === 'string') {
    return badRequest('Missing transaction screenshot');
  }
  if (typeof proof.size === 'number' && proof.size > MAX_PROOF_BYTES) {
    return badRequest('Screenshot too large (max 8 MB)', 413);
  }

  const rawName = (proof.name || '').toString();
  const rawExt = (rawName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.has(rawExt)) {
    return badRequest('Screenshot must be a JPG, PNG, WEBP, or GIF image');
  }
  const declaredType = (proof.type || '').toLowerCase();
  if (declaredType && !declaredType.startsWith('image/')) {
    return badRequest('Invalid screenshot file type');
  }
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const contentType = EXT_TO_MIME[rawExt];

  // Magic-bytes check before anything else costly. If the screenshot is not
  // actually a JPEG/PNG/WEBP/GIF, reject up-front so we never spend a
  // Turnstile lookup, DB read, or R2 write on a malformed payload.
  const magic = await assertImageFile(proof, rawExt);
  if (!magic.ok) {
    return badRequest(magic.error);
  }

  // ---- Parse + validate JSON envelope ---------------------------------------
  if (!dataRaw || typeof dataRaw !== 'string') {
    return badRequest('Missing customer details');
  }
  let body;
  try { body = JSON.parse(dataRaw); } catch (e) { return badRequest('Invalid customer details JSON'); }

  const captcha = await verifyTurnstile(body && body.captchaToken, env, request);
  if (!captcha.ok) return captchaFailedResponse(captcha.error);

  const { email, first_name, middle_name, last_name, phone, items } = body || {};

  if (!isValidName(first_name)) return badRequest('Invalid first name');
  if (!isOptionalName(middle_name)) return badRequest('Invalid middle name');
  if (!isValidName(last_name)) return badRequest('Invalid last name');
  if (!isValidEmail(email)) return badRequest('Invalid email');
  if (!isValidPhoneSimple(phone)) return badRequest('Invalid phone number');

  const itemsSan = sanitizeItemsArray(items);
  if (itemsSan.length === 0) return badRequest('Cart is empty');

  const pricing = await priceCart(DB, itemsSan);
  if (!pricing.ok) {
    return badRequest(pricing.error, 400, pricing.code ? { code: pricing.code } : {});
  }

  // Manual MoMo: customer pays the cart subtotal exactly — no fee is added.
  const amountVal = pricing.total;

  // ---- Persist screenshot to R2 ---------------------------------------------
  const filename = `uploads/payments/${crypto.randomUUID()}.${ext}`;
  try {
    await env.UPLOADS.put(filename, proof.stream(), {
      httpMetadata: { contentType }
    });
  } catch (err) {
    console.error('R2 upload failed', err);
    return badRequest('Could not save your screenshot. Please try again.', 500);
  }
  const proofUrl = `/images/${filename}`;

  // ---- Insert pending purchase row ------------------------------------------
  const reference = generateReference();
  const id = generateUUIDv7();

  try {
    const insert = await DB.prepare(`
      INSERT INTO purchases (
        id, reference, customer_email,
        customer_first_name, customer_middle_name, customer_last_name,
        customer_phone, amount, items_json,
        payment_method, payment_proof_url, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_momo', ?, 'awaiting_review')
    `).bind(
      id,
      reference,
      sanitizeString(email, 254),
      sanitizeString(first_name, 120),
      sanitizeString(middle_name, 120) || null,
      sanitizeString(last_name, 120),
      sanitizeString(phone, 32) || '',
      amountVal,
      JSON.stringify(itemsSan),
      proofUrl
    ).run();

    if (!insert.success) {
      // Best-effort cleanup of the orphaned R2 object so storage doesn't bloat.
      try { await env.UPLOADS.delete(filename); } catch (e) { /* ignore */ }
      return badRequest('Failed to record purchase', 500);
    }
  } catch (err) {
    console.error('purchases insert failed', err);
    try { await env.UPLOADS.delete(filename); } catch (e) { /* ignore */ }
    return badRequest('Failed to record purchase', 500);
  }

  return new Response(JSON.stringify({
    status: 'success',
    reference,
    amount: amountVal
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
