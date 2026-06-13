export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Select one random scripture from the database
    const { results } = await env.DB.prepare(
      'SELECT * FROM scriptures ORDER BY RANDOM() LIMIT 1'
    ).all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: 'No scriptures found in the database.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the randomly selected scripture
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Devotional API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
