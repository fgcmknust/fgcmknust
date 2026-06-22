import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';
import { formatGHS, escapeHtml, escapeAttrUrl } from '../../utils/helpers.js';

const STAT_TILES = [
  { key: 'events',                    label: 'Events',                icon: 'calendar-days', href: ADMIN_ROUTES.events },
  { key: 'products',                  label: 'Products',              icon: 'shopping-bag',  href: ADMIN_ROUTES.products },
  { key: 'members',                   label: 'Members',               icon: 'user-round' },
  { key: 'event_registrations',       label: 'Event Registrations',   icon: 'clipboard-check', href: ADMIN_ROUTES.eventRegistrations },
  { key: 'purchases',                 label: 'Total Purchases',       icon: 'receipt' },
  { key: 'purchases_awaiting_review', label: 'Awaiting Review',       icon: 'shield-alert', alert: true }
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return iso;
  }
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'success' || s === 'paid') return '<span class="admin-badge is-success">Paid</span>';
  if (s === 'awaiting_review') return '<span class="admin-badge is-pending">Awaiting Review</span>';
  if (s === 'failed' || s === 'cancelled') return '<span class="admin-badge is-failed">Failed</span>';
  return `<span class="admin-badge is-pending">${escapeHtml(status || 'Pending')}</span>`;
}

export async function AdminDashboard(container) {
  // The real auth check is the cookie verified by /api/admin/* server-side.
  // This flag is just an optimistic SPA hint that lets us redirect to login
  // without making an extra round-trip; the API call below will still 401 if
  // the session has expired, and we handle that.
  if (sessionStorage.getItem('fgcm_admin_active') !== '1') {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  const statsGrid = STAT_TILES.map((tile) => `
    <a href="${tile.href ? escapeAttrUrl(tile.href) : '#'}"
       class="admin-stat ${tile.alert ? 'is-alert' : ''}"
       style="text-decoration: none; color: inherit; ${tile.href ? '' : 'cursor: default;'}">
      <div class="admin-stat-icon"><i data-lucide="${escapeHtml(tile.icon)}"></i></div>
      <p class="admin-stat-label">${escapeHtml(tile.label)}</p>
      <p class="admin-stat-value" data-stat="${escapeHtml(tile.key)}">—</p>
    </a>
  `).join('');

  const content = `
    <section class="admin-stat-grid" data-section="stats">
      ${statsGrid}
    </section>

    <section class="admin-card" data-section="recent">
      <div class="admin-card-header">
        <h2 class="admin-card-title">Recent Purchases</h2>
        <span class="text-small text-muted" id="recent-meta">Loading…</span>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Reference</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Proof</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody id="recent-tbody">
            <tr><td colspan="7" class="admin-empty">Loading recent purchases…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  container.innerHTML = renderAdminShell({
    title: 'Welcome back, Admin',
    subtitle: 'Snapshot of registrations, sales, and payments awaiting your review.',
    current: 'dashboard',
    content
  });

  attachAdminShellBehavior();

  // ----- Load stats ----------------------------------------------------------
  try {
    // The HttpOnly session cookie attaches automatically. credentials:
    // 'include' is belt-and-braces in case the admin ever lives on a
    // subdomain different from the one that set the cookie.
    const res = await fetch('/api/admin/stats', { credentials: 'include' });

    if (res.status === 401) {
      sessionStorage.removeItem('fgcm_admin_active');
      window.appNavigate(ADMIN_ROUTES.login);
      return;
    }

    if (!res.ok) {
      document.querySelector('[data-section="stats"]').insertAdjacentHTML('afterend',
        `<div class="admin-card" style="border-color: rgba(211,47,47,0.4); background: rgba(211,47,47,0.04);">
          <p class="mb-0" style="color: #d32f2f;"><strong>Could not load dashboard data.</strong> Check the admin token and try refreshing.</p>
        </div>`);
      return;
    }

    const data = await res.json();

    // Fill tiles
    STAT_TILES.forEach((tile) => {
      const el = container.querySelector(`[data-stat="${tile.key}"]`);
      if (el) el.textContent = Number(data[tile.key] || 0).toLocaleString();
    });

    // Fill recent purchases
    const tbody = document.getElementById('recent-tbody');
    const meta = document.getElementById('recent-meta');
    const recent = Array.isArray(data.recent_purchases) ? data.recent_purchases : [];

    if (recent.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" class="admin-empty">
          <i data-lucide="inbox"></i>
          <p class="mb-0">No purchases yet.</p>
        </td></tr>`;
      meta.textContent = '0 records';
    } else {
      tbody.innerHTML = recent.map((p) => `
        <tr>
          <td>
            <div style="font-weight: 600;">${escapeHtml(p.customer_name || '—')}</div>
            <div class="text-small text-muted">${escapeHtml(p.customer_email || '')}</div>
          </td>
          <td><code style="font-size: 0.78rem;">${escapeHtml(p.reference || '')}</code></td>
          <td>${escapeHtml(p.payment_method === 'manual_momo' ? 'MoMo (manual)' : (p.payment_method || '—'))}</td>
          <td style="font-weight: 600;">${escapeHtml(formatGHS(Number(p.amount) || 0))}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${p.payment_proof_url
              ? `<a href="${escapeAttrUrl(p.payment_proof_url)}" target="_blank" rel="noopener">
                   <img src="${escapeAttrUrl(p.payment_proof_url)}" alt="Proof" class="admin-proof-thumb" loading="lazy">
                 </a>`
              : '<span class="text-muted text-small">—</span>'}</td>
          <td class="text-small text-muted">${escapeHtml(formatDate(p.created_at))}</td>
        </tr>
      `).join('');
      meta.textContent = `${recent.length} most recent`;
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Stats load failed', err);
    document.querySelector('[data-section="stats"]').insertAdjacentHTML('afterend',
      `<div class="admin-card" style="border-color: rgba(211,47,47,0.4); background: rgba(211,47,47,0.04);">
        <p class="mb-0" style="color: #d32f2f;"><strong>Network error.</strong> Could not reach the admin API.</p>
      </div>`);
  }
}
