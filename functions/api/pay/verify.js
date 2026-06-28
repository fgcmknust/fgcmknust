// GET /api/pay/verify
// Confirms a transaction with Hubtel's Transaction Status Check API and updates
// the D1 row. Called by /payment-status after Hubtel redirects the customer to
// our returnUrl, and as a backstop to the asynchronous callback (/webhook).

import { isValidReference } from '../_validation.js';
import { hasHubtelConfig, fetchHubtelStatus, sanitizeGatewayData } from '../_hubtel.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const DB = env.DB;

  const url = new URL(request.url);
  const reference = url.searchParams.get('reference');

  if (!reference || !isValidReference(reference)) {
    return new Response(JSON.stringify({ error: 'Valid reference is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!hasHubtelConfig(env)) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const result = await fetchHubtelStatus(env, reference);
  const data = result.data;

  if (result.paid) {
    // Validate the amount Hubtel confirms matches the pending purchase amount,
    // to defend against tampering between initialize and verify. Hubtel returns
    // the amount as a decimal in cedis (not minor units).
    const stored = await DB.prepare('SELECT amount FROM purchases WHERE reference = ?').bind(reference).first();
    if (stored) {
      const expected = Math.round(Number(stored.amount) * 100);
      const got = Math.round(Number(data && (data.amount ?? data.Amount)) * 100);
      if (got !== expected) {
        await DB.prepare(`
          UPDATE purchases
          SET status = 'amount_mismatch', hubtel_response = ?, updated_at = CURRENT_TIMESTAMP
          WHERE reference = ?
        `).bind(JSON.stringify(sanitizeGatewayData(data)), reference).run();
        return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    await DB.prepare(`
      UPDATE purchases
      SET status = 'success', hubtel_response = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference = ?
    `).bind(JSON.stringify(sanitizeGatewayData(data)), reference).run();

    return new Response(JSON.stringify({
      status: 'success',
      message: 'Payment verified',
      reference
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const failStatus = result.status ? String(result.status).toLowerCase() : 'failed';
  await DB.prepare(`
    UPDATE purchases
    SET status = ?, hubtel_response = ?, updated_at = CURRENT_TIMESTAMP
    WHERE reference = ?
  `).bind(failStatus, JSON.stringify(sanitizeGatewayData(data) || {}), reference).run();

  return new Response(JSON.stringify({
    error: 'Payment not successful',
    hubtel_status: failStatus
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
