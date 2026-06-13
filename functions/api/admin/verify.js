// GET /api/admin/verify
// Returns 200 if the admin Bearer token is valid. The admin middleware handles auth;
// this endpoint exists so the login page has an explicit, predictable success response.

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
