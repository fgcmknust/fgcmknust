export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();
    
    const formattedProducts = results.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      image: row.image_url,
      sizes: JSON.parse(row.sizes_json),
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
}
