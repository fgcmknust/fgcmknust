/* FGCM-KNUST service worker
 *
 * Repeat visits are served from cache so the page paints instantly even on
 * slow 3G. Deploys still roll out promptly because:
 *   - HTML is fetched network-first (cache used only as offline fallback)
 *   - The runtime cache is namespaced by VERSION — bump it on every deploy
 *     that changes the SW contract, and old caches are wiped on activate.
 *   - /api/* is bypassed entirely (always live data)
 *
 * Hashed assets (/assets/*) and images (/images/*) use cache-first because
 * either they are content-addressed (Vite hash) or change rarely (logo, hero
 * shots). If a static image is replaced in-place, bump VERSION to invalidate.
 */

const VERSION = 'v1';
const RUNTIME_CACHE = `fgcm-runtime-${VERSION}`;

self.addEventListener('install', () => {
  // Activate immediately so users get the new SW on their next navigation
  // instead of waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('fgcm-') && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin traffic. External origins (fonts, Cloudflare
  // Insights, the Hubtel hosted checkout) are handled by the browser directly.
  if (url.origin !== self.location.origin) return;

  // Never intercept live data (/api/*) or analytics beacons.
  if (url.pathname.startsWith('/api/')) return;

  const accept = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (sw.js, manifest-like files, _redirects): network-first.
  event.respondWith(networkFirst(request));
});

async function networkFirstHTML(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      // SPA fallback target — cache the root shell under '/' so we can
      // serve any deep-link offline.
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('/');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Network failed and no cache match');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// Allow the page to ask for an immediate update (e.g. after a deploy).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
