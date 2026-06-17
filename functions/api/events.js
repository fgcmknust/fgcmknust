import { withEdgeCache } from './_cache.js';
import { readReplica } from './_session.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const isSpecial = url.searchParams.get('special');

  // Events change only via admin edits, so cache briefly at the edge. The
  // default URL-based cache key keeps the ?special=1 variant separate from the
  // full list automatically.
  return withEdgeCache(context, { maxAge: 60 }, async () => {
    try {
      let query = `SELECT * FROM events ORDER BY date ASC`;

      if (isSpecial === '1') {
        query = `SELECT * FROM events WHERE is_special = 1 ORDER BY created_at DESC`;
      }

      const { results } = await readReplica(env).prepare(query).all();

      // Map database rows to the camelCase format expected by the frontend
      const formattedEvents = results.map(row => ({
        id: row.id,
        title: row.title,
        date: row.date,
        time: row.time,
        venue: row.venue,
        description: row.description,
        image: row.image_url,
        category: row.category,
        isFeatured: row.is_featured === 1,
        isSpecial: row.is_special === 1,
        eventStatus: row.event_status
      }));

      return new Response(JSON.stringify(formattedEvents), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Events query failed', error);
      return new Response(JSON.stringify({ error: 'Failed to load events' }), { status: 500 });
    }
  });
}
