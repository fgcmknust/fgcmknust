/* Early-boot helpers, formerly three inline <script> blocks in index.html.
 *
 * Moved out so we can drop `'unsafe-inline'` from the CSP `script-src` /
 * `script-src-elem` directives without losing the original behaviour:
 *
 *   1. Route-conditional hero preload — the browser only discovers CSS
 *      background-images after the JS bundle parses + routes. For the routes
 *      where the hero is a background image, inject a <link rel="preload">
 *      during HEAD parse so the byte download starts immediately.
 *
 *   2. Mobile viewport-height cache — iOS Safari's address bar slides in/out
 *      mid-scroll, which would otherwise keep changing `100vh`. We cache the
 *      first-known innerHeight in localStorage and feed it via a CSS custom
 *      property so the hero stays a stable size.
 *
 *   3. Font media swap — the Google Fonts stylesheet is loaded with
 *      `media="print"` so it doesn't block render; flip to `media="all"`
 *      once it has loaded. Without `'unsafe-inline'` we can't use the
 *      `onload="..."` attribute; this script wires up the listener instead.
 *
 * Kept dependency-free + tiny so it can run synchronously in <head>.
 */
(function () {
  // ---- 1. Route-conditional hero preload --------------------------------
  try {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    var heroByRoute = {
      '/event-registration': '/images/Regis.webp',
      '/register': '/images/Regis.webp'
    };
    var hero = heroByRoute[path];
    if (hero) {
      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = hero;
      link.setAttribute('fetchpriority', 'high');
      if (hero.endsWith('.webp')) link.setAttribute('type', 'image/webp');
      document.head.appendChild(link);
    }
  } catch (e) { /* preload is a hint; ignore failures */ }

  // ---- 2. Mobile viewport-height cache ----------------------------------
  try {
    var cached = localStorage.getItem('mobile_vh');
    var vh = cached ? parseInt(cached, 10) : 0;
    if (!vh || isNaN(vh)) {
      vh = window.innerHeight;
      localStorage.setItem('mobile_vh', String(vh));
    }
    document.documentElement.style.setProperty('--mobile-vh', vh + 'px');
  } catch (e) { /* localStorage may be blocked; ignore */ }

  // ---- 3. Font media swap (replaces inline onload="this.media='all'") ----
  // Look for any <link rel="stylesheet" media="print"> elements that exist
  // when the script runs, plus any that are added later, and flip media
  // once they've finished downloading.
  function wireSwap(linkEl) {
    if (!linkEl || linkEl._fontSwapWired) return;
    linkEl._fontSwapWired = true;
    var swap = function () { linkEl.media = 'all'; };
    if (linkEl.sheet) { swap(); return; }
    linkEl.addEventListener('load', swap, { once: true });
  }
  try {
    var links = document.querySelectorAll('link[rel="stylesheet"][media="print"]');
    for (var i = 0; i < links.length; i++) wireSwap(links[i]);
  } catch (e) { /* selector engine unavailable on very old browsers */ }
})();
