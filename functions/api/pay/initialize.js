// POST /api/pay/initialize
// Initializes a Paystack transaction and creates a pending purchase record in D1.
//
// Security notes:
// - The amount is always recomputed server-side from product prices in the DB.
//   The client-supplied `amount` field is ignored entirely so a tampered cart
//   can never lower the price.
// - The reference is generated server-side, not trusted from the client.

import { generateUUIDv7 } from '../_utils.js';
import {
  isValidEmail, isValidPhoneSimple, sanitizeItemsArray, sanitizeString,
  isValidName, isOptionalName
} from '../_validation.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';
import { verifyTurnstile, captchaFailedResponse } from '../_turnstile.js';
import { computeChargeBreakdown } from '../_fees.js';

function generateReference() {
  // 16 random bytes → 32 hex chars; comfortably unique and unguessable.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `FGCM_${hex.toUpperCase()}`;
}

async function priceCart(DB, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Cart is empty' };
  }

  // Cap quantities to prevent integer-overflow style abuse.
  const MAX_QTY = 50;
  const ids = [];
  const qtyById = new Map();
  for (const it of items) {
    const id = sanitizeString(it.id, 128);
    let qty = Number(it.quantity);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    qty = Math.min(Math.floor(qty), MAX_QTY);
    ids.push(id);
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  if (ids.length === 0) return { ok: false, error: 'Cart has no valid items' };

  // Lookup all referenced products in one query.
  const uniqueIds = [...new Set(ids)];
  const placeholders = uniqueIds.map(() => '?').join(',');
  const { results } = await DB.prepare(
    `SELECT id, price FROM products WHERE id IN (${placeholders})`
  ).bind(...uniqueIds).all();

  const priceById = new Map((results || []).map(r => [r.id, Number(r.price)]));
  let total = 0;
  for (const id of uniqueIds) {
    const price = priceById.get(id);
    if (price === undefined || !Number.isFinite(price) || price < 0) {
      return { ok: false, error: 'Unknown product in cart' };
    }
    total += price * qtyById.get(id);
  }

  // Round to 2 decimals (cedis).
  total = Math.round(total * 100) / 100;
  if (total <= 0) return { ok: false, error: 'Computed cart total is zero' };
  return { ok: true, total };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;

  const ip = getClientIp(request);
  const rl = await rateLimit(DB, `pay-init:${ip}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return tooManyRequests(rl);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const captcha = await verifyTurnstile(body && body.captchaToken, env, request);
  if (!captcha.ok) return captchaFailedResponse(captcha.error);

  const { email, first_name, middle_name, last_name, phone, items } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!isValidName(first_name)) return new Response(JSON.stringify({ error: 'Invalid first name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!isOptionalName(middle_name)) return new Response(JSON.stringify({ error: 'Invalid middle name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!isValidName(last_name)) return new Response(JSON.stringify({ error: 'Invalid last name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!isValidEmail(email)) return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!isValidPhoneSimple(phone)) return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const itemsSan = sanitizeItemsArray(items);
  const pricing = await priceCart(DB, itemsSan);
  if (!pricing.ok) {
    return new Response(JSON.stringify({ error: pricing.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Subtotal = sum of product prices. Fee = Paystack processing fee. Amount = subtotal + fee.
  const { subtotal: subtotalVal, fee: feeVal, total: amountVal } = computeChargeBreakdown(pricing.total);

  const reference = generateReference();
  const id = generateUUIDv7();

  const insert = await DB.prepare(`
    INSERT INTO purchases (id, reference, customer_email, customer_first_name, customer_middle_name, customer_last_name, customer_phone, amount, items_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    id,
    reference,
    sanitizeString(email, 254),
    sanitizeString(first_name, 120),
    sanitizeString(middle_name, 120) || null,
    sanitizeString(last_name, 120),
    sanitizeString(phone, 32) || '',
    amountVal,
    JSON.stringify(itemsSan)
  ).run();

  if (!insert.success) {
    return new Response(JSON.stringify({ error: 'Failed to record pending transaction' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const paystackPublicKey = env.PAYSTACK_PUBLIC_KEY;
  const paystackSecretKey = env.PAYSTACK_SECRET_KEY;

  if (!paystackPublicKey && !paystackSecretKey) {
    return new Response(JSON.stringify({ error: 'Paystack keys not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let paystackInit = null;
  try {
    if (paystackSecretKey) {
      const amountInPesewas = Math.round(amountVal * 100);
      const displayName = [first_name, middle_name, last_name].filter(Boolean).join(' ');
      const payload = {
        email,
        amount: amountInPesewas,
        reference,
        metadata: { phone: phone || '', name: displayName, items: itemsSan }
      };
      if (env.PAYSTACK_CALLBACK_URL) payload.callback_url = env.PAYSTACK_CALLBACK_URL;

      const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let psData = null;
      const text = await psRes.text();
      try { psData = text ? JSON.parse(text) : null; } catch (e) { psData = null; }

      if (psRes.ok && psData && psData.status) {
        paystackInit = psData.data;
      } else {
        console.warn('Paystack initialize failed', { status: psRes.status });
      }
    }
  } catch (err) {
    console.error('Error initializing Paystack transaction', err);
  }

  return new Response(JSON.stringify({
    status: 'success',
    reference,
    subtotal: subtotalVal,
    fee: feeVal,
    amount: amountVal,
    publicKey: paystackPublicKey || null,
    paystack: paystackInit
  }), { headers: { 'Content-Type': 'application/json' } });
}
