/**
 * Admin path config.
 *
 * Access control is now handled at the DNS / subdomain layer (admin lives on
 * a dedicated subdomain, the public site never serves it). Inside the admin
 * subdomain the conventional `/admin/*` paths are fine.
 *
 * If you ever lose the subdomain protection and want path obscurity again,
 * change `ADMIN_BASE` to something like `/__fgcm-console-fk7x9p2m` and
 * redeploy — every consumer of ADMIN_ROUTES picks it up automatically.
 */
export const ADMIN_BASE = '/admin';

export const ADMIN_ROUTES = {
  login: `${ADMIN_BASE}/login`,
  dashboard: ADMIN_BASE,
  events: `${ADMIN_BASE}/events`,
  products: `${ADMIN_BASE}/products`
};
