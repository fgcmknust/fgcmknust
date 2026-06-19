// GET /api/pay/verify
// Verifies a Paystack transaction with the Secret Key and updates the D1 row.

import { isValidReference } from '../_validation.js';

// Whitelist only the fields we actually use when reviewing a transaction —
// keeps the card-adjacent / PCI-scope authorization block (last 4, BIN, bank,
// auth_code, etc.) OUT of D1. Paystack remains the source of truth for the
// full payload if we ever need it.
function sanitizePaystackData(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    reference: data.reference,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    channel: data.channel,
    paid_at: data.paid_at,
    transaction_date: data.transaction_date,
    gateway_response: data.gateway_response,
    fees: data.fees
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const DB = env.DB;

  const url = new URL(request.url);
  const reference = url.searchParams.get('reference');

  if (!reference || !isValidReference(reference)) {
    return new Response(JSON.stringify({ error: 'Valid reference is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  let paystackData = null;
  try { paystackData = await paystackRes.json(); } catch (e) { paystackData = null; }

  const data = paystackData && paystackData.data ? paystackData.data : null;
  const isSuccess = paystackRes.ok && paystackData && paystackData.status && data && data.status === 'success';

  if (isSuccess) {
    // Validate that the amount Paystack confirms matches the pending purchase amount,
    // to defend against tampering between initialize and verify.
    const stored = await DB.prepare('SELECT amount FROM purchases WHERE reference = ?').bind(reference).first();
    if (stored) {
      const expectedPesewas = Math.round(Number(stored.amount) * 100);
      if (Number(data.amount) !== expectedPesewas) {
        await DB.prepare(`
          UPDATE purchases
          SET status = 'amount_mismatch', paystack_response = ?, updated_at = CURRENT_TIMESTAMP
          WHERE reference = ?
        `).bind(JSON.stringify(sanitizePaystackData(data)), reference).run();
        return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    await DB.prepare(`
      UPDATE purchases
      SET status = 'success', paystack_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference = ?
    `).bind(JSON.stringify(sanitizePaystackData(data)), reference).run();

    return new Response(JSON.stringify({
      status: 'success',
      message: 'Payment verified',
      reference: data.reference
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const failStatus = data && data.status ? data.status : 'failed';
  await DB.prepare(`
    UPDATE purchases
    SET status = ?, paystack_response = ?, updated_at = CURRENT_TIMESTAMP
    WHERE reference = ?
  `).bind(failStatus, JSON.stringify(sanitizePaystackData(data) || {}), reference).run();

  return new Response(JSON.stringify({
    error: 'Payment not successful',
    paystack_status: failStatus
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
