// POST /api/pay/initialize
// Creates a Hubtel Online Checkout invoice and a pending purchase record in D1.
//
// Hubtel uses a HOSTED-REDIRECT model (unlike the old inline popup): we create
// the invoice server-side, get back a `checkoutUrl`, and the browser is then
// redirected to Hubtel's hosted page to pay. After payment Hubtel POSTs the
// result to our `callbackUrl` (/api/pay/webhook) and redirects the customer to
// our `returnUrl` (/payment-status), which re-confirms via /api/pay/verify.
//
// Security notes:
// - The amount is always recomputed server-side from product prices in the DB.
//   The client-supplied `amount` field is ignored entirely so a tampered cart
//   can never lower the price.
// - The clientReference is generated server-side, not trusted from the client.

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

  // Subtotal = sum of product prices. Fee = Hubtel processing fee. Amount = subtotal + fee.
  const { subtotal: subtotalVal, fee: feeVal, total: amountVal } = computeChargeBreakdown(pricing.total);

  const reference = generateReference();
  const id = generateUUIDv7();

  const insert = await DB.prepare(`
    INSERT INTO purchases (id, reference, customer_email, customer_first_name, customer_middle_name, customer_last_name, customer_phone, amount, items_json, status, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'hubtel')
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

  // Hubtel credentials (Basic auth) + the POS / merchant account number.
  const clientId = env.HUBTEL_CLIENT_ID;
  const clientSecret = env.HUBTEL_CLIENT_SECRET;
  const merchantAccount = env.HUBTEL_MERCHANT_ACCOUNT;

  if (!clientId || !clientSecret || !merchantAccount) {
    return new Response(JSON.stringify({ error: 'Hubtel keys not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Build callback/return URLs from the request origin so the same code works
  // across preview + production deployments. Allow env overrides if needed.
  const origin = new URL(request.url).origin;
  const callbackUrl = env.HUBTEL_CALLBACK_URL || `${origin}/api/pay/webhook`;
  const returnUrl = `${origin}/payment-status?reference=${encodeURIComponent(reference)}`;
  const cancellationUrl = `${origin}/cart`;
  const displayName = [first_name, middle_name, last_name].filter(Boolean).join(' ');

  let checkoutUrl = null;
  try {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const payload = {
      // Hubtel expects the amount as a decimal in the merchant's currency (GHS).
      totalAmount: amountVal,
      description: `FGCM-KNUST order ${reference}`,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      merchantAccountNumber: merchantAccount,
      clientReference: reference,
      payeeName: displayName,
      payeeMobileNumber: phone || '',
      payeeEmail: email || ''
    };

    const hubtelRes = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let hubtelData = null;
    const text = await hubtelRes.text();
    try { hubtelData = text ? JSON.parse(text) : null; } catch (e) { hubtelData = null; }

    // Hubtel returns { status: "Success", data: { checkoutUrl, checkoutDirectUrl, ... } }
    if (hubtelRes.ok && hubtelData && hubtelData.data && (hubtelData.data.checkoutUrl || hubtelData.data.checkoutDirectUrl)) {
      checkoutUrl = hubtelData.data.checkoutDirectUrl || hubtelData.data.checkoutUrl;
    } else {
      console.warn('Hubtel initiate failed', { status: hubtelRes.status });
    }
  } catch (err) {
    console.error('Error initializing Hubtel checkout', err);
  }

  return new Response(JSON.stringify({
    status: 'success',
    reference,
    subtotal: subtotalVal,
    fee: feeVal,
    amount: amountVal,
    // The frontend redirects the browser to this hosted Hubtel checkout page.
    checkoutUrl
  }), { headers: { 'Content-Type': 'application/json' } });
}
