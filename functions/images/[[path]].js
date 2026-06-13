export async function onRequestGet(context) {
  const { request, env, params } = context;

  // params.path is an array of path segments
  const segments = Array.isArray(params.path) ? params.path : [params.path];

  // Reject path-traversal tokens, control chars, and backslashes.
  for (const seg of segments) {
    if (typeof seg !== 'string') return new Response('Bad path', { status: 400 });
    if (seg === '..' || seg === '.' || seg.includes('\\')) {
      return new Response('Bad path', { status: 400 });
    }
    // Disallow ASCII control chars (0x00-0x1F and 0x7F).
    for (let i = 0; i < seg.length; i++) {
      const code = seg.charCodeAt(i);
      if (code < 32 || code === 127) {
        return new Response('Bad path', { status: 400 });
      }
    }
  }

  const path = segments.join('/');

  try {
    if (path.startsWith('uploads/')) {
      const object = await env.UPLOADS.get(path);
      if (object === null) {
        return new Response('Image not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(object.body, { headers });
    }

    // Fall back to static assets served by Pages.
    return env.ASSETS.fetch(request);
  } catch (error) {
    console.error('Image proxy error', error);
    return new Response('Error retrieving image', { status: 500 });
  }
}
