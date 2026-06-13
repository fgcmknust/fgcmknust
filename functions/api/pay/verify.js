// GET /api/pay/verify
// Verifies a Paystack transaction with the Secret Key and updates the D1 row.

import { isValidReference } from '../_validation.js';

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
        `).bind(JSON.stringify(data), reference).run();
        return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    await DB.prepare(`
      UPDATE purchases
      SET status = 'success', paystack_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference = ?
    `).bind(JSON.stringify(data), reference).run();

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
  `).bind(failStatus, JSON.stringify(data || {}), reference).run();

  return new Response(JSON.stringify({
    error: 'Payment not successful',
    paystack_status: failStatus
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
