// GET /api/admin/nominations — list all nominations (admin-protected via middleware)

export async function onRequestGet(context) {
  const { env } = context;
  const result = await env.DB.prepare(
    `SELECT id, first_name, middle_name, last_name, phone, email, role, statement, submitted_at
     FROM nominations
     ORDER BY submitted_at DESC`
  ).all();
  return Response.json(result.results || []);
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  let data;
  try { data = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const id = String(data.id || '').trim();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  await env.DB.prepare(`DELETE FROM nominations WHERE id = ?`).bind(id).run();
  return Response.json({ success: true });
}
