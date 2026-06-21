import { renderAdminShell, attachAdminShellBehavior } from './_layout.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';
import { escapeHtml } from '../../utils/helpers.js';

function fmt(unixSec) {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
}

function toLocalDatetimeInput(unixSec) {
  if (!unixSec) return '';
  const d = new Date(unixSec * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sessionStatus(s) {
  const now = Math.floor(Date.now() / 1000);
  if (now < s.opens_at)  return '<span class="admin-badge" style="background:#e0f2fe;color:#0369a1;">Upcoming</span>';
  if (now <= s.closes_at) return '<span class="admin-badge is-success">Open</span>';
  return '<span class="admin-badge" style="background:#f3f4f6;color:#6b7280;">Closed</span>';
}

export async function AdminAttendance(container) {
  if (sessionStorage.getItem('fgcm_admin_active') !== '1') {
    window.appNavigate(ADMIN_ROUTES.login);
    return;
  }

  const attendanceUrl = window.location.origin + '/attendance';

  container.innerHTML = renderAdminShell({
    title: 'Attendance',
    subtitle: 'Create sessions and track who showed up',
    current: 'attendance',
    headerExtra: `<button class="admin-btn admin-btn-primary" id="att-new-btn">
                    <i data-lucide="plus"></i> New Session
                  </button>`,
    content: `
      <!-- QR Code card -->
      <div class="admin-card mb-3" id="att-qr-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Attendance QR Code</h2>
          <button class="admin-btn" id="att-print-btn"><i data-lucide="printer"></i> Print</button>
        </div>
        <div style="display:flex; gap:2rem; align-items:center; flex-wrap:wrap; padding: 0.5rem 0 0.25rem;">
          <img id="att-qr-img" alt="Attendance QR Code"
               style="width:200px;height:200px;border:1px solid #e5e7eb;border-radius:8px;flex-shrink:0;display:block;">
          <div>
            <p style="font-size:0.875rem;color:var(--color-text-muted);margin:0 0 0.5rem;">
              Display or print this QR code at your event.<br>Members scan it with their phone to mark attendance.
            </p>
            <code style="font-size:0.78rem;word-break:break-all;color:var(--color-gold-dark);">${escapeHtml(attendanceUrl)}</code>
          </div>
        </div>
      </div>

      <!-- Create session modal (hidden by default) -->
      <div class="admin-card mb-3" id="att-create-card" style="display:none;">
        <div class="admin-card-header">
          <h2 class="admin-card-title">New Attendance Session</h2>
          <button class="admin-btn" id="att-create-cancel">Cancel</button>
        </div>
        <form id="att-create-form" style="display:grid;gap:1rem;max-width:520px;">
          <div>
            <label class="admin-label">Session Label <span style="color:#dc2626">*</span></label>
            <input class="admin-input" id="att-label" placeholder="e.g. Sunday Service — 22 June 2026" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div>
              <label class="admin-label">Opens At <span style="color:#dc2626">*</span></label>
              <input class="admin-input" type="datetime-local" id="att-opens" required>
            </div>
            <div>
              <label class="admin-label">Closes At <span style="color:#dc2626">*</span></label>
              <input class="admin-input" type="datetime-local" id="att-closes" required>
            </div>
          </div>
          <p class="admin-form-hint">Members can only mark attendance between these two times. You can create the session in advance.</p>
          <p id="att-create-err" class="admin-form-error" style="display:none;"></p>
          <button type="submit" class="admin-btn admin-btn-primary" id="att-create-submit">Create Session</button>
        </form>
      </div>

      <!-- Sessions table -->
      <div class="admin-card" id="att-sessions-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Sessions</h2>
          <span class="text-small text-muted" id="att-sessions-meta">Loading…</span>
        </div>
        <div id="att-sessions-body">
          <div class="admin-empty">Loading sessions…</div>
        </div>
      </div>

      <!-- Records panel (shown when a session is selected) -->
      <div class="admin-card mt-3" id="att-records-card" style="display:none;">
        <div class="admin-card-header">
          <h2 class="admin-card-title" id="att-records-title">Records</h2>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <button class="admin-btn" id="att-export-btn"><i data-lucide="download"></i> CSV</button>
            <button class="admin-btn" id="att-records-close">✕ Close</button>
          </div>
        </div>
        <div id="att-records-body"></div>
      </div>
    `
  });

  if (window.lucide) lucide.createIcons({ root: container });
  attachAdminShellBehavior(container);

  // Set QR code src
  const qrImg = container.querySelector('#att-qr-img');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodeURIComponent(attendanceUrl)}`;

  // Print QR
  container.querySelector('#att-print-btn').addEventListener('click', () => {
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`
      <html><head><title>Attendance QR Code</title>
      <style>body{font-family:sans-serif;text-align:center;padding:2rem;}img{width:280px;height:280px;}p{font-size:0.9rem;color:#555;margin-top:1rem;}</style>
      </head><body>
      <h2 style="margin:0 0 1rem;">FGCM-KNUST Attendance</h2>
      <img src="${escapeHtml(qrImg.src)}" alt="QR Code">
      <p>Scan to mark attendance<br><code>${escapeHtml(attendanceUrl)}</code></p>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>`);
    w.document.close();
  });

  // Show/hide create form
  container.querySelector('#att-new-btn').addEventListener('click', () => {
    const card = container.querySelector('#att-create-card');
    card.style.display = card.style.display === 'none' ? '' : 'none';
    if (card.style.display !== 'none') {
      // Pre-fill sensible defaults: open now, close in 2 hours
      const now   = new Date();
      const close = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      container.querySelector('#att-opens').value  = toLocalDatetimeInput(Math.floor(now.getTime()/1000));
      container.querySelector('#att-closes').value = toLocalDatetimeInput(Math.floor(close.getTime()/1000));
    }
  });
  container.querySelector('#att-create-cancel').addEventListener('click', () => {
    container.querySelector('#att-create-card').style.display = 'none';
  });

  // Create session form submit
  container.querySelector('#att-create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl  = container.querySelector('#att-create-err');
    const btn    = container.querySelector('#att-create-submit');
    const label  = container.querySelector('#att-label').value.trim();
    const opens  = container.querySelector('#att-opens').value;
    const closes = container.querySelector('#att-closes').value;

    const opens_at  = Math.floor(new Date(opens).getTime()  / 1000);
    const closes_at = Math.floor(new Date(closes).getTime() / 1000);

    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      const res  = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, opens_at, closes_at })
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent   = data.error || 'Failed to create session';
        errEl.style.display = '';
        btn.disabled = false;
        btn.textContent = 'Create Session';
        return;
      }
      container.querySelector('#att-create-card').style.display = 'none';
      container.querySelector('#att-create-form').reset();
      await loadSessions(container);
    } catch {
      errEl.textContent   = 'Network error — please try again';
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Create Session';
    }
  });

  // Close records panel
  container.querySelector('#att-records-close').addEventListener('click', () => {
    container.querySelector('#att-records-card').style.display = 'none';
  });

  // Load initial sessions
  await loadSessions(container);
}

async function loadSessions(container) {
  const meta = container.querySelector('#att-sessions-meta');
  const body = container.querySelector('#att-sessions-body');
  try {
    const res      = await fetch('/api/admin/attendance');
    if (res.status === 401) { window.appNavigate(ADMIN_ROUTES.login); return; }
    const sessions = await res.json();
    meta.textContent = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`;

    if (!sessions.length) {
      body.innerHTML = '<div class="admin-empty">No sessions yet — create one above.</div>';
      return;
    }

    body.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Label</th>
            <th>Opens</th>
            <th>Closes</th>
            <th>Status</th>
            <th>Count</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${sessions.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.label)}</strong></td>
                <td class="text-small">${escapeHtml(fmt(s.opens_at))}</td>
                <td class="text-small">${escapeHtml(fmt(s.closes_at))}</td>
                <td>${sessionStatus(s)}</td>
                <td><strong>${s.record_count}</strong></td>
                <td style="display:flex;gap:0.4rem;">
                  <button class="admin-btn att-view-btn" data-id="${escapeHtml(s.id)}" data-label="${escapeHtml(s.label)}">
                    <i data-lucide="list"></i> View
                  </button>
                  <button class="admin-btn att-del-btn" data-id="${escapeHtml(s.id)}" data-label="${escapeHtml(s.label)}"
                          style="color:#dc2626;" title="Delete session">
                    <i data-lucide="trash-2"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;

    if (window.lucide) lucide.createIcons({ root: body });

    body.querySelectorAll('.att-view-btn').forEach(btn => {
      btn.addEventListener('click', () => loadRecords(container, btn.dataset.id, btn.dataset.label));
    });
    body.querySelectorAll('.att-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete session "${btn.dataset.label}" and all its records?`)) return;
        await fetch(`/api/admin/attendance/${btn.dataset.id}`, { method: 'DELETE' });
        await loadSessions(container);
        container.querySelector('#att-records-card').style.display = 'none';
      });
    });

  } catch {
    body.innerHTML = '<div class="admin-empty" style="color:#dc2626;">Failed to load sessions.</div>';
    meta.textContent = 'Error';
  }
}

async function loadRecords(container, sessionId, label) {
  const card  = container.querySelector('#att-records-card');
  const title = container.querySelector('#att-records-title');
  const body  = container.querySelector('#att-records-body');
  const expBtn = container.querySelector('#att-export-btn');

  card.style.display = '';
  title.textContent  = `Records — ${label}`;
  body.innerHTML     = '<div class="admin-empty">Loading…</div>';

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  let records = [];
  try {
    const res  = await fetch(`/api/admin/attendance/${sessionId}`);
    const data = await res.json();
    records = data.records || [];

    if (!records.length) {
      body.innerHTML = '<div class="admin-empty">No attendance records yet.</div>';
      return;
    }

    body.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>#</th><th>Name</th><th>Phone</th><th>Marked At</th>
          </tr></thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td class="text-muted">${i + 1}</td>
                <td><strong>${escapeHtml(r.full_name)}</strong></td>
                <td class="text-small">${escapeHtml(r.phone)}</td>
                <td class="text-small">${escapeHtml(fmt(r.marked_at))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-muted text-small" style="padding: 0.5rem 0.25rem;">${records.length} attendee${records.length !== 1 ? 's' : ''}</p>
    `;
  } catch {
    body.innerHTML = '<div class="admin-empty" style="color:#dc2626;">Failed to load records.</div>';
  }

  // CSV export
  expBtn.onclick = () => {
    if (!records.length) return;
    const rows  = [['#', 'Full Name', 'Phone', 'Marked At']];
    records.forEach((r, i) => rows.push([i+1, r.full_name, r.phone, fmt(r.marked_at)]));
    const csv   = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob  = new Blob([csv], { type: 'text/csv' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `attendance-${label.replace(/[^a-z0-9]/gi, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
