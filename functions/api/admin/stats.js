// GET /api/admin/stats
// Admin-only dashboard payload. One auth'd call returns everything the
// dashboard needs so the page paints with a single roundtrip.

import { readReplica } from '../_session.js';

export async function onRequestGet(context) {
  const { env } = context;
  // Dashboard counts/listing are read-only → serve from the nearest replica.
  const DB = readReplica(env);

  // Run these in parallel over the replica session: each individual read is
  // replica-eligible, so they complete in ~one round trip to the nearest
  // replica. (We intentionally avoid batch() here — a batch is a transaction
  // whose replica routing is undocumented and may be forced to the far
  // primary, which would be slower for a distant admin.)
  const [
    eventsRes,
    productsRes,
    membersRes,
    eventRegsRes,
    purchasesRes,
    pendingPurchasesRes,
    recentPurchasesRes
  ] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS c FROM events`).first(),
    DB.prepare(`SELECT COUNT(*) AS c FROM products`).first(),
    DB.prepare(`SELECT COUNT(*) AS c FROM members`).first(),
    DB.prepare(`SELECT COUNT(*) AS c FROM event_registrations`).first(),
    DB.prepare(`SELECT COUNT(*) AS c FROM purchases`).first(),
    DB.prepare(`SELECT COUNT(*) AS c FROM purchases WHERE status = 'awaiting_review'`).first(),
    DB.prepare(`
      SELECT reference, customer_first_name, customer_last_name, customer_email,
             amount, status, payment_method, payment_proof_url, created_at
      FROM purchases
      ORDER BY created_at DESC
      LIMIT 6
    `).all()
  ]);

  const recent = (recentPurchasesRes.results || []).map((p) => ({
    reference: p.reference,
    customer_name: [p.customer_first_name, p.customer_last_name].filter(Boolean).join(' '),
    customer_email: p.customer_email,
    amount: p.amount,
    status: p.status,
    payment_method: p.payment_method,
    payment_proof_url: p.payment_proof_url,
    created_at: p.created_at
  }));

  return Response.json({
    events: eventsRes && eventsRes.c || 0,
    products: productsRes && productsRes.c || 0,
    members: membersRes && membersRes.c || 0,
    event_registrations: eventRegsRes && eventRegsRes.c || 0,
    purchases: purchasesRes && purchasesRes.c || 0,
    purchases_awaiting_review: pendingPurchasesRes && pendingPurchasesRes.c || 0,
    recent_purchases: recent
  });
}
