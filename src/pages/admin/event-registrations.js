import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { showToast } from '../../components/toast.js';
import { escapeHtml } from '../../utils/helpers.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';

export async function AdminEventRegistrations(container) {
  if (sessionStorage.getItem('fgcm_admin_active') !== '1') {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  container.innerHTML = renderAdminShell({
    title: 'Event Registrations',
    subtitle: 'All members who registered for events',
    current: 'eventRegistrations',
    content: `
      <div class="card p-3 shadow-sm">
        <div class="flex justify-between items-center mb-3 gap-2" style="flex-wrap:wrap;">
          <h3 class="mb-0 font-body">All Registrations</h3>
          <div class="flex gap-2">
            <button id="er-export-csv" class="btn btn-outline btn-sm flex items-center gap-1">
              <i data-lucide="download" class="icon-sm"></i> Export CSV
            </button>
            <button id="er-refresh" class="btn btn-outline btn-sm flex items-center gap-1">
              <i data-lucide="refresh-cw" class="icon-sm"></i> Refresh
            </button>
          </div>
        </div>

        <div class="flex gap-2 mb-3" style="flex-wrap:wrap;">
          <input type="text" id="er-search" class="form-control" placeholder="Search name, email, phone…" style="max-width:260px;">
          <select id="er-event-filter" class="form-control" style="max-width:280px;">
            <option value="">All Events</option>
          </select>
        </div>

        <div id="er-table-wrap" style="overflow-x:auto;">
          <p class="text-muted">Loading…</p>
        </div>
      </div>
    `,
  });

  attachAdminShellBehavior(container);
  if (window.lucide) lucide.createIcons({ root: container });

  let allRegistrations = [];

  async function loadRegistrations() {
    document.getElementById('er-table-wrap').innerHTML = '<p class="text-muted">Loading…</p>';
    try {
      const res = await fetch('/api/admin/event-registrations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      allRegistrations = await res.json();
      populateEventFilter();
      renderTable();
    } catch {
      document.getElementById('er-table-wrap').innerHTML = '<p class="text-error">Failed to load registrations.</p>';
    }
  }

  function populateEventFilter() {
    const seen = new Map();
    allRegistrations.forEach(r => {
      if (r.event_id && !seen.has(r.event_id)) seen.set(r.event_id, r.event_name || r.event_id);
    });
    const sel = document.getElementById('er-event-filter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All Events</option>' +
      [...seen.entries()].map(([id, name]) =>
        `<option value="${escapeHtml(id)}"${id === current ? ' selected' : ''}>${escapeHtml(name)}</option>`
      ).join('');
  }

  function renderTable() {
    const search = (document.getElementById('er-search').value || '').toLowerCase();
    const eventFilter = document.getElementById('er-event-filter').value;

    const filtered = allRegistrations.filter(r => {
      const matchSearch = !search ||
        `${r.first_name} ${r.middle_name || ''} ${r.last_name} ${r.email} ${r.phone}`.toLowerCase().includes(search);
      const matchEvent = !eventFilter || r.event_id === eventFilter;
      return matchSearch && matchEvent;
    });

    const wrap = document.getElementById('er-table-wrap');
    if (filtered.length === 0) {
      wrap.innerHTML = '<p class="text-muted">No registrations found.</p>';
      return;
    }

    const rows = filtered.map(r => {
      const date = r.created_at
        ? new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
      const fullName = [r.first_name, r.middle_name, r.last_name].filter(Boolean).map(escapeHtml).join(' ');
      return `
        <tr>
          <td style="white-space:nowrap;">${fullName}</td>
          <td>${escapeHtml(r.email)}</td>
          <td>${escapeHtml(r.phone)}</td>
          <td><span class="badge badge-info" style="white-space:nowrap;">${escapeHtml(r.event_name || r.event_id || '—')}</span></td>
          <td class="text-muted text-small" style="white-space:nowrap;">${date}</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <p class="text-muted text-small mb-2">${filtered.length} of ${allRegistrations.length} registration${allRegistrations.length !== 1 ? 's' : ''}</p>
      <table class="admin-table w-full">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Event</th><th>Registered At</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  document.getElementById('er-search').addEventListener('input', renderTable);
  document.getElementById('er-event-filter').addEventListener('change', renderTable);
  document.getElementById('er-refresh').addEventListener('click', loadRegistrations);

  document.getElementById('er-export-csv').addEventListener('click', () => {
    if (!allRegistrations.length) { showToast('No data to export.', 'info'); return; }
    const headers = ['First Name', 'Middle Name', 'Last Name', 'Email', 'Phone', 'Event', 'Registered At'];
    const rows = allRegistrations.map(r => [
      r.first_name, r.middle_name || '', r.last_name, r.email, r.phone,
      r.event_name || r.event_id || '',
      r.created_at ? new Date(r.created_at).toISOString() : ''
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `event-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  loadRegistrations();
}
