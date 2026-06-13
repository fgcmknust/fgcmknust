// GET /api/config
// Returns public configuration the SPA needs at runtime.

export async function onRequestGet(context) {
  const { env } = context;
  return new Response(
    JSON.stringify({
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
      turnstileEnabled: !!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY)
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    }
  );
}
