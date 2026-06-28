// Parse a JSON-encoded array column safely. If the column is missing,
// null, or malformed, fall back to an empty array — never returns undefined
// (which would template-literal into the literal string "undefined" on the
// product page color picker).
import { withEdgeCache } from './_cache.js';
import { readReplica } from './_session.js';

function parseJsonArray(value) {
  if (value == null) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function onRequestGet(context) {
  const { env } = context;

  // Products change rarely, so cache briefly at the
  // edge: the catalog loads instantly worldwide and edits propagate within the
  // TTL. Keep this short so changes appear quickly without a global purge.
  return withEdgeCache(context, { maxAge: 60 }, async () => {
    try {
      const { results } = await readReplica(env).prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();

      const formattedProducts = results.map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        description: row.description,
        image: row.image_url,
        sizes: parseJsonArray(row.sizes_json),
        colors: parseJsonArray(row.colors_json),
        category: row.category,
        isFeatured: row.is_featured === 1
      }));

      return new Response(JSON.stringify(formattedProducts), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Products query failed', error);
      return new Response(JSON.stringify({ error: 'Failed to load products' }), { status: 500 });
    }
  });
}
