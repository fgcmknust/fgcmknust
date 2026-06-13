/**
 * Pass route-sensitive identifiers (event IDs, product IDs, etc.) between
 * pages without exposing them in the URL.
 *
 * Producer side: set with `setNavState('eventId', id)` before navigating,
 *   OR add `data-event-id="..."` / `data-product-id="..."` to a link/element —
 *   the global click delegate below will stash it automatically.
 *
 * Consumer side: call `getNavState('eventId')` on the destination page.
 *   By default the value is consumed (removed) after read so back-navigation
 *   doesn't accidentally re-trigger anything.
 */
const PREFIX = 'nav:';

export function setNavState(key, value) {
  if (value == null) return;
  try { sessionStorage.setItem(PREFIX + key, String(value)); } catch (e) { /* ignore */ }
}

export function getNavState(key, { consume = true } = {}) {
  try {
    const value = sessionStorage.getItem(PREFIX + key);
    if (consume && value !== null) sessionStorage.removeItem(PREFIX + key);
    return value;
  } catch (e) {
    return null;
  }
}

/**
 * Install a capture-phase click delegate that copies any `data-event-id`
 * or `data-product-id` from a clicked link into sessionStorage *before*
 * the router intercepts the navigation. Must be called once at app boot.
 */
export function installNavStateDelegate() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-event-id], [data-product-id]');
    if (!el) return;
    if (el.dataset.eventId)   setNavState('eventId', el.dataset.eventId);
    if (el.dataset.productId) setNavState('productId', el.dataset.productId);
  }, { capture: true });
}
