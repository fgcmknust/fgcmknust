// GET /api/admin/event-registrations — list all event registrations (admin-protected)

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const eventId = url.searchParams.get('event_id') || null;

  const query = eventId
    ? `SELECT id, event_id, event_name, first_name, middle_name, last_name, email, phone, created_at
       FROM event_registrations WHERE event_id = ? ORDER BY created_at DESC`
    : `SELECT id, event_id, event_name, first_name, middle_name, last_name, email, phone, created_at
       FROM event_registrations ORDER BY created_at DESC`;

  const stmt = eventId
    ? env.DB.prepare(query).bind(eventId)
    : env.DB.prepare(query);

  const result = await stmt.all();
  return Response.json(result.results || []);
}
