// GET /api/purchases
// Admin-only: list recent purchases (PII).
// Customer order history should be fetched via authenticated session in a future iteration.

import { isValidEmail } from './_validation.js';
import { checkAdminAuth } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = checkAdminAuth(request, env);
  if (!auth.ok) return auth.response;

  const DB = env.DB;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  let result;

  if (email) {
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    result = await DB.prepare(`
      SELECT reference, amount, currency, status, items_json, created_at
      FROM purchases
      WHERE customer_email = ?
      ORDER BY created_at DESC
      LIMIT 200
    `).bind(email).all();
  } else {
    result = await DB.prepare(`
      SELECT reference, customer_first_name, customer_middle_name, customer_last_name, customer_email, amount, status, created_at
      FROM purchases
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
  }

  const purchases = (result.results || []).map(p => {
    if (p.items_json) {
      try {
        p.items = JSON.parse(p.items_json);
        delete p.items_json;
      } catch (e) {
        p.items = [];
      }
    }
    if (p.customer_first_name) {
      p.customer_name = [p.customer_first_name, p.customer_middle_name, p.customer_last_name].filter(Boolean).join(' ');
    }
    return p;
  });

  return Response.json({ purchases, count: purchases.length });
}
