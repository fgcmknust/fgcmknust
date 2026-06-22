import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { showToast } from '../../components/toast.js';
import { escapeHtml } from '../../utils/helpers.js';

export async function AdminNominations(container) {
  container.innerHTML = renderAdminShell({
    title: 'Nominations',
    subtitle: 'Self-nominations submitted for leadership roles',
    current: 'nominations',
    content: `
      <div class="card p-3 shadow-sm">
        <div class="flex justify-between items-center mb-3 gap-2" style="flex-wrap:wrap;">
          <h3 class="mb-0 font-body">All Submissions</h3>
          <div class="flex gap-2">
            <button id="nom-export-csv" class="btn btn-outline btn-sm flex items-center gap-1">
              <i data-lucide="download" class="icon-sm"></i> Export CSV
            </button>
            <button id="nom-refresh" class="btn btn-outline btn-sm flex items-center gap-1">
              <i data-lucide="refresh-cw" class="icon-sm"></i> Refresh
            </button>
          </div>
        </div>

        <div id="nom-filter-bar" class="flex gap-2 mb-3" style="flex-wrap:wrap;">
          <input type="text" id="nom-search" class="form-control" placeholder="Search name, phone, email…" style="max-width:260px;">
          <select id="nom-role-filter" class="form-control" style="max-width:240px;">
            <option value="">All Positions</option>
          </select>
        </div>

        <div id="nom-table-wrap" style="overflow-x:auto;">
          <p class="text-muted">Loading…</p>
        </div>
      </div>

      <style>
        .nom-stmt-cell { max-width: 260px; }
        .nom-stmt-short { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; display: block; cursor: pointer; }
        .nom-stmt-full { display: none; white-space: pre-wrap; background: var(--color-bg-alt); border-radius: 6px; padding: 0.5rem 0.75rem; margin-top: 0.35rem; font-size: 0.82rem; }
        .nom-stmt-short.expanded + .nom-stmt-full { display: block; }
        .nom-stmt-short.expanded { white-space: normal; overflow: visible; text-overflow: unset; }
      </style>
    `,
  });

  attachAdminShellBehavior(container);
  if (window.lucide) lucide.createIcons({ root: container });

  let allNominations = [];

  async function loadNominations() {
    document.getElementById('nom-table-wrap').innerHTML = '<p class="text-muted">Loading…</p>';
    try {
      const res = await fetch('/api/admin/nominations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      allNominations = await res.json();
      populateRoleFilter();
      renderTable();
    } catch {
      document.getElementById('nom-table-wrap').innerHTML = '<p class="text-error">Failed to load nominations.</p>';
    }
  }

  function populateRoleFilter() {
    const roles = [...new Set(allNominations.map(n => n.role))].sort();
    const sel = document.getElementById('nom-role-filter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All Positions</option>' +
      roles.map(r => `<option value="${escapeHtml(r)}"${r === current ? ' selected' : ''}>${escapeHtml(r)}</option>`).join('');
  }

  function renderTable() {
    const search = (document.getElementById('nom-search').value || '').toLowerCase();
    const roleFilter = document.getElementById('nom-role-filter').value;

    const filtered = allNominations.filter(n => {
      const matchSearch = !search ||
        `${n.first_name} ${n.middle_name || ''} ${n.last_name} ${n.phone} ${n.email} ${n.statement}`.toLowerCase().includes(search);
      const matchRole = !roleFilter || n.role === roleFilter;
      return matchSearch && matchRole;
    });

    const wrap = document.getElementById('nom-table-wrap');
    if (filtered.length === 0) {
      wrap.innerHTML = '<p class="text-muted">No nominations found.</p>';
      return;
    }

    const rows = filtered.map(n => {
      const date = new Date(n.submitted_at * 1000).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const stmtShort = escapeHtml((n.statement || '').slice(0, 80)) + ((n.statement || '').length > 80 ? '…' : '');
      const stmtFull  = escapeHtml(n.statement || '');
      return `
        <tr>
          <td style="white-space:nowrap;">${escapeHtml(n.first_name)}${n.middle_name ? ' ' + escapeHtml(n.middle_name) : ''} ${escapeHtml(n.last_name)}</td>
          <td>${escapeHtml(n.phone)}</td>
          <td>${escapeHtml(n.email)}</td>
          <td><span class="badge badge-info" style="white-space:nowrap;">${escapeHtml(n.role)}</span></td>
          <td class="nom-stmt-cell text-small">
            <span class="nom-stmt-short" title="Click to expand">${stmtShort}</span>
            <div class="nom-stmt-full">${stmtFull}</div>
          </td>
          <td class="text-muted text-small" style="white-space:nowrap;">${date}</td>
          <td>
            <button class="nom-delete-btn" data-id="${escapeHtml(n.id)}" style="color:var(--color-error,#e53e3e);background:none;border:none;cursor:pointer;padding:0.2rem 0.4rem;" title="Delete">
              <i data-lucide="trash-2" style="width:14px;height:14px;pointer-events:none;"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <p class="text-muted text-small mb-2">${filtered.length} of ${allNominations.length} nomination${allNominations.length !== 1 ? 's' : ''}</p>
      <table class="admin-table w-full">
        <thead>
          <tr>
            <th>Name</th><th>Phone</th><th>Email</th><th>Position</th><th>Suitability Statement</th><th>Submitted</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    if (window.lucide) lucide.createIcons({ root: wrap });

    // Expand/collapse statement on click
    wrap.querySelectorAll('.nom-stmt-short').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('expanded'));
    });

    wrap.querySelectorAll('.nom-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this nomination?')) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch('/api/admin/nominations', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) throw new Error();
          allNominations = allNominations.filter(n => n.id !== id);
          populateRoleFilter();
          renderTable();
          showToast('Nomination deleted.', 'success');
        } catch {
          showToast('Failed to delete nomination.', 'error');
        }
      });
    });
  }

  document.getElementById('nom-search').addEventListener('input', renderTable);
  document.getElementById('nom-role-filter').addEventListener('change', renderTable);
  document.getElementById('nom-refresh').addEventListener('click', loadNominations);

  document.getElementById('nom-export-csv').addEventListener('click', () => {
    if (!allNominations.length) { showToast('No data to export.', 'info'); return; }
    const headers = ['First Name', 'Middle Name', 'Last Name', 'Phone', 'Email', 'Position', 'Suitability Statement', 'Submitted At'];
    const rows = allNominations.map(n => [
      n.first_name, n.middle_name || '', n.last_name, n.phone, n.email, n.role, n.statement,
      new Date(n.submitted_at * 1000).toISOString()
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nominations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  loadNominations();
}
