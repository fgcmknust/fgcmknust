// POST /api/pay/webhook
// Hubtel's Online Checkout callback. After a customer pays on the hosted page,
// Hubtel POSTs the result here. Hubtel callbacks are NOT signed, so we never
// trust the posted body on its own — we extract the clientReference and
// re-confirm the payment server-to-server via the Transaction Status Check API
// before marking the purchase paid.

import { fetchHubtelStatus, sanitizeGatewayData } from '../_hubtel.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;

  let event;
  try {
    event = await request.json();
  } catch (e) {
    // Always acknowledge so Hubtel doesn't retry a malformed delivery forever.
    return new Response('OK', { status: 200 });
  }

  // The callback nests the payload under `Data` (PascalCase); be tolerant of
  // either casing so a minor Hubtel response change doesn't silently break this.
  const payload = (event && (event.Data || event.data)) || event || {};
  const reference = payload.ClientReference || payload.clientReference;

  if (reference) {
    try {
      const result = await fetchHubtelStatus(env, reference);
      if (result.paid) {
        const current = await DB.prepare('SELECT status, amount FROM purchases WHERE reference = ?').bind(reference).first();
        if (current && current.status !== 'success') {
          // Defend against a tampered/replayed callback for a different amount.
          const expected = Math.round(Number(current.amount) * 100);
          const got = Math.round(Number(result.data && (result.data.amount ?? result.data.Amount)) * 100);
          const status = got === expected ? 'success' : 'amount_mismatch';
          await DB.prepare(`
            UPDATE purchases
            SET status = ?, hubtel_response = ?, updated_at = CURRENT_TIMESTAMP
            WHERE reference = ?
          `).bind(status, JSON.stringify(sanitizeGatewayData(result.data)), reference).run();
        }
      }
    } catch (err) {
      console.error('Webhook status confirmation failed', err);
      // Acknowledge regardless; /api/pay/verify (return URL) is the backstop.
    }
  }

  return new Response('OK', { status: 200 });
}
