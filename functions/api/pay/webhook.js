// POST /api/pay/webhook
// Receives events from Paystack (e.g. charge.success)

import { constantTimeEqual } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const DB = env.DB;
  const secretKey = env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const signature = request.headers.get('x-paystack-signature') || '';
  const bodyText = await request.text();

  // HMAC SHA-512 signature verification (Paystack docs)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  if (!constantTimeEqual(signature.toLowerCase(), expectedSignature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(bodyText);
  } catch (e) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (event && event.event === 'charge.success' && event.data && typeof event.data.reference === 'string') {
    const reference = event.data.reference;
    try {
      const current = await DB.prepare('SELECT status FROM purchases WHERE reference = ?').bind(reference).first();
      if (current && current.status !== 'success') {
        await DB.prepare(`
          UPDATE purchases
          SET status = 'success', paystack_response = ?, updated_at = CURRENT_TIMESTAMP
          WHERE reference = ?
        `).bind(JSON.stringify(event.data), reference).run();
      }
    } catch (err) {
      console.error('Webhook DB update failed', err);
      // Acknowledge to Paystack regardless; failed DB writes are surfaced via logs.
    }
  }

  return new Response('OK', { status: 200 });
}
