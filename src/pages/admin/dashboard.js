import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';
import { formatGHS, escapeHtml, escapeAttrUrl } from '../../utils/helpers.js';

const STAT_TILES = [
  { key: 'members',                   label: 'Members',             icon: 'users',           accent: '#2563EB', href: null },
  { key: 'event_registrations',       label: 'Event Registrations', icon: 'clipboard-list',  accent: '#0891B2', href: ADMIN_ROUTES.eventRegistrations },
  { key: 'events',                    label: 'Events',              icon: 'calendar-days',   accent: '#C5973E', href: ADMIN_ROUTES.events },
  { key: 'products',                  label: 'Products',            icon: 'shopping-bag',    accent: '#64748B', href: ADMIN_ROUTES.products },
  { key: 'purchases',                 label: 'Total Purchases',     icon: 'receipt',         accent: '#16A34A', href: null },
  { key: 'purchases_awaiting_review', label: 'Awaiting Review',     icon: 'shield-alert',    accent: '#DC2626', href: ADMIN_ROUTES.products, alert: true },
];

const QUICK_LINKS = [
  { label: 'Manage Events',        href: ADMIN_ROUTES.events,             icon: 'calendar-days'  },
  { label: 'Manage Merch',         href: ADMIN_ROUTES.products,           icon: 'shopping-bag'   },
  { label: 'Event Registrations',  href: ADMIN_ROUTES.eventRegistrations, icon: 'clipboard-list' },
  { label: 'Attendance',           href: ADMIN_ROUTES.attendance,         icon: 'clipboard-check'},
  { label: 'Nominations',          href: ADMIN_ROUTES.nominations,        icon: 'award'          },
];

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'success' || s === 'paid') return '<span class="admin-badge is-success">Paid</span>';
  if (s === 'awaiting_review')         return '<span class="admin-badge is-pending">Awaiting Review</span>';
  if (s === 'failed' || s === 'cancelled') return '<span class="admin-badge is-failed">Failed</span>';
  return `<span class="admin-badge is-pending">${escapeHtml(status || 'Pending')}</span>`;
}

function initials(name) {
  return (name || '—').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export async function AdminDashboard(container) {
  if (sessionStorage.getItem('fgcm_admin_active') !== '1') {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  const metricsHTML = STAT_TILES.map(tile => `
    <${tile.href ? `a href="${escapeAttrUrl(tile.href)}"` : 'div'}
      class="dash-metric${tile.alert ? ' is-alert' : ''}"
      style="border-left-color:${tile.accent};"
      ${tile.href ? '' : 'tabindex="-1"'}>
      <div class="dash-metric-icon" style="background:${tile.accent}18; color:${tile.accent};">
        <i data-lucide="${escapeHtml(tile.icon)}"></i>
      </div>
      <div class="dash-metric-value" data-stat="${escapeHtml(tile.key)}">—</div>
      <div class="dash-metric-label">${escapeHtml(tile.label)}</div>
      ${tile.href ? `<div class="dash-metric-link" style="color:${tile.accent};">View <i data-lucide="arrow-right" style="width:12px;height:12px;"></i></div>` : ''}
    </${tile.href ? 'a' : 'div'}>
  `).join('');

  const quickLinksHTML = QUICK_LINKS.map(l => `
    <a href="${escapeAttrUrl(l.href)}" class="dash-ql">
      <span class="dash-ql-icon"><i data-lucide="${escapeHtml(l.icon)}"></i></span>
      <span class="dash-ql-label">${escapeHtml(l.label)}</span>
      <i data-lucide="chevron-right" class="dash-ql-arrow"></i>
    </a>
  `).join('');

  const content = `
    <style>
      .dash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.75rem; padding-bottom:1.25rem; border-bottom:1px solid var(--admin-line); gap:1rem; }
      .dash-header-sub { font-size:0.78rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--admin-text-muted); }
      .dash-datetime { font-size:0.8rem; color:var(--admin-text-muted); line-height:1.6; }
      .dash-datetime strong { font-size:0.85rem; color:var(--admin-ink); font-weight:600; }

      .dash-section-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--admin-text-muted); margin:0 0 0.9rem; padding-bottom:0.6rem; border-bottom:1px solid var(--admin-line); }

      .dash-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.75rem; }
      @media(max-width:1100px){ .dash-metrics{ grid-template-columns:repeat(2,1fr); } }
      @media(max-width:560px) { .dash-metrics{ grid-template-columns:1fr; } }

      .dash-metric { background:#fff; border:1px solid var(--admin-line); border-left-width:3px; border-radius:6px; padding:1.2rem 1.2rem 1rem; display:flex; flex-direction:column; position:relative; text-decoration:none; color:inherit; cursor:default; transition:box-shadow 0.15s, transform 0.15s; }
      a.dash-metric { cursor:pointer; }
      a.dash-metric:hover { box-shadow:0 4px 14px rgba(0,0,0,0.07); transform:translateY(-1px); }
      .dash-metric.is-alert { background:#FEF9F9; }

      .dash-metric-icon { position:absolute; top:1.1rem; right:1.1rem; width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
      .dash-metric-icon i { width:16px; height:16px; }
      .dash-metric-value { font-size:2rem; font-weight:700; font-family:var(--font-heading); line-height:1; margin:0 0 0.35rem; color:var(--admin-ink); }
      .dash-metric-label { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:var(--admin-text-muted); margin:0; }
      .dash-metric-link { margin-top:0.9rem; font-size:0.73rem; font-weight:600; display:inline-flex; align-items:center; gap:0.25rem; opacity:0.45; transition:opacity 0.15s; }
      a.dash-metric:hover .dash-metric-link { opacity:1; }

      .dash-body { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:1.25rem; }
      @media(max-width:900px){ .dash-body{ grid-template-columns:1fr; } }

      .dash-ql { display:flex; align-items:center; gap:0.75rem; padding:0.7rem 0.85rem; border:1px solid var(--admin-line); border-radius:6px; text-decoration:none; color:var(--admin-ink); font-size:0.85rem; font-weight:500; background:#fff; transition:border-color 0.15s, background 0.15s; margin-bottom:0.5rem; }
      .dash-ql:last-child { margin-bottom:0; }
      .dash-ql:hover { border-color:var(--admin-gold); background:var(--admin-gold-soft); }
      .dash-ql-icon { width:28px; height:28px; border-radius:5px; display:flex; align-items:center; justify-content:center; background:var(--admin-gold-soft); flex-shrink:0; }
      .dash-ql-icon i { width:14px; height:14px; color:var(--admin-gold); }
      .dash-ql-label { flex:1; }
      .dash-ql-arrow { width:14px; height:14px; color:var(--admin-text-muted); opacity:0.4; flex-shrink:0; transition:opacity 0.15s, transform 0.15s; }
      .dash-ql:hover .dash-ql-arrow { opacity:0.8; transform:translateX(2px); }

      .dash-avatar { width:32px; height:32px; border-radius:50%; background:var(--admin-gold-soft); color:var(--admin-gold); font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
      .dash-customer { display:flex; align-items:center; gap:0.65rem; }
      .dash-customer-info { min-width:0; }
      .dash-customer-name { font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
      .dash-customer-email { font-size:0.75rem; color:var(--admin-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
    </style>

    <div class="dash-header">
      <div>
        <p class="dash-header-sub" style="margin:0;">FGCM-KNUST · Admin Portal</p>
        <div class="dash-datetime" id="dash-clock" style="text-align:left;margin-top:0.15rem;">
          <strong id="dash-time" style="font-size:1rem;"></strong>
          <span id="dash-date" style="margin-left:0.5rem;"></span>
        </div>
      </div>
      <span class="admin-badge is-success" style="align-self:center;font-size:0.7rem;padding:0.3rem 0.7rem;">Live</span>
    </div>

    <p class="dash-section-label">Key Metrics</p>
    <div class="dash-metrics" data-section="stats">
      ${metricsHTML}
    </div>

    <div class="dash-body">
      <div>
        <div class="admin-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.6rem; border-bottom:1px solid var(--admin-line);">
            <p class="dash-section-label" style="margin:0; border:none; padding:0;">Recent Purchases</p>
            <span class="text-small" style="color:var(--admin-text-muted);" id="recent-meta">Loading…</span>
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
                  <th>Date</th>
                </tr>
              </thead>
              <tbody id="recent-tbody">
                <tr><td colspan="7" class="admin-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="admin-card" style="padding:1.25rem;">
          <p class="dash-section-label">Quick Access</p>
          ${quickLinksHTML}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = renderAdminShell({
    title: 'Dashboard',
    subtitle: '',
    current: 'dashboard',
    content,
  });

  attachAdminShellBehavior();
  if (window.lucide) lucide.createIcons({ root: container });

  // Live clock
  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('dash-time');
    const dateEl = document.getElementById('dash-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  updateClock();
  const clockInterval = setInterval(updateClock, 30000);
  window.addEventListener('routechange', () => clearInterval(clockInterval), { once: true });

  // Load stats
  try {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });

    if (res.status === 401) {
      sessionStorage.removeItem('fgcm_admin_active');
      window.appNavigate(ADMIN_ROUTES.login);
      return;
    }

    if (!res.ok) {
      container.querySelector('[data-section="stats"]').insertAdjacentHTML('afterend',
        `<div class="admin-card" style="border-color:rgba(220,38,38,0.3);background:rgba(220,38,38,0.03);">
          <p style="color:#DC2626;margin:0;"><strong>Could not load dashboard data.</strong> Check the admin token and try refreshing.</p>
        </div>`);
      return;
    }

    const data = await res.json();

    STAT_TILES.forEach(tile => {
      const el = container.querySelector(`[data-stat="${tile.key}"]`);
      if (el) el.textContent = Number(data[tile.key] || 0).toLocaleString();
    });

    const tbody  = document.getElementById('recent-tbody');
    const meta   = document.getElementById('recent-meta');
    const recent = Array.isArray(data.recent_purchases) ? data.recent_purchases : [];

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="admin-empty"><i data-lucide="inbox"></i><p class="mb-0">No purchases yet.</p></td></tr>`;
      meta.textContent = '0 records';
    } else {
      tbody.innerHTML = recent.map(p => `
        <tr>
          <td>
            <div class="dash-customer">
              <div class="dash-avatar">${escapeHtml(initials(p.customer_name))}</div>
              <div class="dash-customer-info">
                <div class="dash-customer-name">${escapeHtml(p.customer_name || '—')}</div>
                <div class="dash-customer-email">${escapeHtml(p.customer_email || '')}</div>
              </div>
            </div>
          </td>
          <td><code style="font-size:0.75rem;background:var(--admin-bg);padding:0.15rem 0.4rem;border-radius:3px;">${escapeHtml(p.reference || '')}</code></td>
          <td style="font-size:0.82rem;">${escapeHtml(p.payment_method === 'manual_momo' ? 'MoMo' : (p.payment_method || '—'))}</td>
          <td style="font-weight:600;">${escapeHtml(formatGHS(Number(p.amount) || 0))}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${p.payment_proof_url
            ? `<a href="${escapeAttrUrl(p.payment_proof_url)}" target="_blank" rel="noopener"><img src="${escapeAttrUrl(p.payment_proof_url)}" alt="Proof" class="admin-proof-thumb" loading="lazy"></a>`
            : '<span style="color:var(--admin-text-muted);font-size:0.8rem;">—</span>'}</td>
          <td style="font-size:0.78rem;color:var(--admin-text-muted);white-space:nowrap;">${escapeHtml(formatDate(p.created_at))}</td>
        </tr>`).join('');
      meta.textContent = `${recent.length} most recent`;
    }

    if (window.lucide) lucide.createIcons({ root: container });
  } catch (err) {
    console.error('Stats load failed', err);
    container.querySelector('[data-section="stats"]').insertAdjacentHTML('afterend',
      `<div class="admin-card" style="border-color:rgba(220,38,38,0.3);background:rgba(220,38,38,0.03);">
        <p style="color:#DC2626;margin:0;"><strong>Network error.</strong> Could not reach the admin API.</p>
      </div>`);
  }
}
