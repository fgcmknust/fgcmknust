/**
 * Shared admin chrome: dark charcoal sidebar + gold accents, premium feel.
 * Every admin page wraps its interior in this shell so the look stays
 * consistent across dashboard, events, and products managers.
 */

import { escapeHtml, escapeAttrUrl } from '../../utils/helpers.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';

const NAV_ITEMS = [
  { key: 'dashboard',  label: 'Dashboard',  href: ADMIN_ROUTES.dashboard,  icon: 'layout-dashboard' },
  { key: 'events',     label: 'Events',     href: ADMIN_ROUTES.events,     icon: 'calendar-days' },
  { key: 'products',   label: 'Merch',      href: ADMIN_ROUTES.products,   icon: 'shopping-bag' },
  { key: 'attendance',  label: 'Attendance',  href: ADMIN_ROUTES.attendance,  icon: 'clipboard-check' },
  { key: 'nominations', label: 'Nominations', href: ADMIN_ROUTES.nominations, icon: 'award' }
];

/**
 * Build the admin layout HTML.
 *
 * @param {object} opts
 * @param {string} opts.title       Heading shown in the topbar
 * @param {string} opts.subtitle    Optional subtitle below the heading
 * @param {string} opts.current     'dashboard' | 'events' | 'products'
 * @param {string} opts.content     Interior page HTML (already escaped where needed)
 * @param {string} [opts.headerExtra] Optional HTML for the right side of the topbar (e.g. action buttons)
 * @returns {string}
 */
export function renderAdminShell(opts) {
  const { title, subtitle = '', current, content, headerExtra = '' } = opts;

  const navHTML = NAV_ITEMS.map((item) => `
    <a href="${escapeAttrUrl(item.href)}" class="admin-nav-item ${item.key === current ? 'is-active' : ''}">
      <i data-lucide="${escapeHtml(item.icon)}" class="admin-nav-icon"></i>
      <span>${escapeHtml(item.label)}</span>
    </a>
  `).join('');

  return `
    <div class="admin-shell">
      <!-- Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-brand">
          <img src="/images/FGCI LOGO.png" alt="FGCM Logo" class="admin-brand-logo" width="36" height="36" decoding="async">
          <div class="admin-brand-text">
            <div class="admin-brand-title">FGCM</div>
            <div class="admin-brand-sub">Admin Portal</div>
          </div>
        </div>

        <nav class="admin-nav">${navHTML}</nav>

        <button id="admin-logout-btn" class="admin-logout">
          <i data-lucide="log-out" class="admin-nav-icon"></i>
          <span>Sign out</span>
        </button>
      </aside>

      <!-- Main column -->
      <div class="admin-main">
        <header class="admin-topbar">
          <button class="admin-sidebar-toggle" id="admin-sidebar-toggle" aria-label="Toggle sidebar">
            <i data-lucide="menu"></i>
          </button>
          <div class="admin-topbar-titles">
            <h1 class="admin-topbar-title">${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="admin-topbar-sub">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          <div class="admin-topbar-actions">${headerExtra}</div>
        </header>

        <main class="admin-content">
          ${content}
        </main>
      </div>

      <div class="admin-sidebar-backdrop" id="admin-sidebar-backdrop"></div>
    </div>
  `;
}

/**
 * Mounts shell-level behaviour: logout, mobile sidebar toggle, lucide icons.
 * Call this after innerHTML has been set with the result of renderAdminShell().
 */
export function attachAdminShellBehavior() {
  if (window.lucide) lucide.createIcons();

  // Hide global navbar / footer behind the shell so nothing competes for space.
  const navbarEl = document.getElementById('navbar-container');
  const footerEl = document.getElementById('footer-container');
  if (navbarEl) navbarEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'none';

  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  const toggle = document.getElementById('admin-sidebar-toggle');

  if (toggle && sidebar && backdrop) {
    const open = () => { sidebar.classList.add('is-open'); backdrop.classList.add('is-open'); };
    const close = () => { sidebar.classList.remove('is-open'); backdrop.classList.remove('is-open'); };
    toggle.addEventListener('click', () => {
      sidebar.classList.contains('is-open') ? close() : open();
    });
    backdrop.addEventListener('click', close);
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      // Server-side revoke: deletes the row in admin_sessions AND clears the
      // HttpOnly cookie via Set-Cookie. We fire-and-don't-block in case the
      // network is flaky — the SPA-side flag clears regardless.
      try {
        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
      } catch (e) { /* ignore */ }
      try { sessionStorage.removeItem('fgcm_admin_active'); } catch (e) { /* ignore */ }
      // Hard navigate to root so the global navbar/footer re-attach cleanly.
      window.location.href = '/';
    });
  }
}
