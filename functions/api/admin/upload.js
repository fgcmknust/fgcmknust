// POST /api/admin/upload
// Admin image upload. Auth handled by admin/_middleware.js.

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
};

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large (max 8 MB)' }), { status: 413 });
    }

    const rawExt = file.name ? file.name.split('.').pop() : '';
    const ext = (rawExt || 'jpg').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
    }

    const declaredType = (file.type || '').toLowerCase();
    const expectedType = EXT_TO_MIME[ext];
    // Use the extension-derived MIME type to avoid trusting the client's content-type header.
    const contentType = expectedType;
    if (declaredType && !declaredType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Invalid file content type' }), { status: 400 });
    }

    const filename = `uploads/${crypto.randomUUID()}.${ext}`;

    await env.UPLOADS.put(filename, file.stream(), {
      httpMetadata: { contentType }
    });

    return new Response(JSON.stringify({ success: true, url: `/images/${filename}` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload failed', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
