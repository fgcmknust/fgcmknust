// GET /api/devotional?date=YYYY-MM-DD
//
// Returns one scripture per local-day. The client sends its own local date
// (so a user in Ghana and a user in London see the right "today" scripture
// for their respective timezones). The server picks the row deterministically
// from the date, so:
//   - Refreshing the page on the same day always returns the same scripture
//   - Crossing local midnight rotates to the next scripture
//   - Two users in the same timezone on the same day get the same reading
//
// Falls back to UTC date if the client omits / forges a bad value.

import { withEdgeCache } from './_cache.js';
import { readReplica } from './_session.js';

function isValidIsoDate(s) {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  // Reject dates more than a day away from "now" — defends against odd input.
  const now = Date.now();
  const drift = Math.abs(d.getTime() - now);
  return drift < 2 * 24 * 60 * 60 * 1000 + 60_000;
}

// xmur3-style string hash → unsigned 32-bit integer. Tiny, deterministic,
// gives a good distribution across the scriptures table.
function hashDate(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function todayUtc() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  // Read-only, eventual consistency is fine → serve from the nearest replica.
  const DB = readReplica(env);

  const url = new URL(request.url);
  const requested = url.searchParams.get('date') || '';
  const dateKey = isValidIsoDate(requested) ? requested : todayUtc();

  // The scripture for a given calendar day never changes, so cache each day's
  // response at the edge for hours. Key on the *normalized* date rather than
  // the raw URL, so missing/forged params that fall back to "today" all share
  // one cache entry instead of fragmenting it.
  return withEdgeCache(
    context,
    { maxAge: 21600, key: `/api/devotional?date=${dateKey}` },
    async () => {
      try {
        // Single round trip: let SQLite compute the offset from the row count.
        // SQLite returns NULL for "x % 0", so an empty table yields no row and
        // we surface a 404 below instead of dividing by zero.
        const result = await DB.prepare(
          `SELECT * FROM scriptures
             ORDER BY id
             LIMIT 1
             OFFSET (? % (SELECT COUNT(*) FROM scriptures))`
        ).bind(hashDate(dateKey)).first();

        if (!result) {
          return new Response(JSON.stringify({ error: 'No scriptures found in the database.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return Response.json({ ...result, date: dateKey });
      } catch (error) {
        console.error('Devotional API error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );
}
