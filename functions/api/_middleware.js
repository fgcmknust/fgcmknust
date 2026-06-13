// Global Error Handling Middleware for API routes
//
// The SPA and API are served from the same origin, so we do not enable
// permissive CORS. Cross-origin callers will simply be rejected by the browser.
// If you ever need to expose a public read-only endpoint to another origin,
// add an explicit allowlist for that route rather than weakening this default.

export const onRequest = async (context) => {
  const { request, next } = context;

  if (request.method === 'OPTIONS') {
    // Same-origin only: no permissive preflight response.
    return new Response(null, { status: 204 });
  }

  try {
    const response = await next();

    // Apply a couple of defensive response headers.
    const newHeaders = new Headers(response.headers);
    if (!newHeaders.has('X-Content-Type-Options')) {
      newHeaders.set('X-Content-Type-Options', 'nosniff');
    }
    if (!newHeaders.has('Cache-Control')) {
      newHeaders.set('Cache-Control', 'no-store');
    }
    if (!newHeaders.has('Referrer-Policy')) {
      newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    console.error('API Error:', err);
    // Do NOT leak err.message to clients.
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
