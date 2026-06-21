import { escapeHtml } from '../utils/helpers.js';

// /attendance — QR code destination for church check-in.
// Not linked from any nav or footer; only reachable via the printed QR code.

// ── Device ID ──────────────────────────────────────────────────────────────
// Persisted in localStorage so the same physical phone can only mark one
// attendance per session, regardless of what phone number is entered.
function getDeviceId() {
  try {
    let id = localStorage.getItem('fgcm_att_device');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          }));
      localStorage.setItem('fgcm_att_device', id);
    }
    return id;
  } catch { return ''; }
}

// ── Entry point ────────────────────────────────────────────────────────────
export async function Attendance(container) {
  container.innerHTML = buildShell('<div class="att-loader"><div class="att-spinner"></div></div>');
  injectStyles(container);

  let session;
  try {
    const res  = await fetch('/api/attendance/active');
    const data = await res.json();
    if (!data.active) { renderState(container, 'no-session'); return; }
    session = data.session;
  } catch {
    renderState(container, 'net-error');
    return;
  }

  renderChoice(container, session);
}

// ── State: choice screen ───────────────────────────────────────────────────
function renderChoice(container, session) {
  body(container).innerHTML = `
    <h2 class="att-title">Mark Attendance</h2>
    <p class="att-sub">${escapeHtml(session.label)}</p>
    <div class="att-choices">
      <button class="att-choice-btn" id="att-member-btn">
        <span class="att-choice-icon">✅</span>
        <strong>Already a Member</strong>
        <span class="att-choice-hint">I've registered with FGCM before</span>
      </button>
      <button class="att-choice-btn" id="att-new-btn">
        <span class="att-choice-icon">✨</span>
        <strong>New to FGCM?</strong>
        <span class="att-choice-hint">Register &amp; mark attendance</span>
      </button>
    </div>`;

  container.querySelector('#att-member-btn').addEventListener('click', () => renderMemberForm(container, session));
  container.querySelector('#att-new-btn').addEventListener('click',   () => renderNewMemberForm(container, session));
}

// ── State: existing member phone form ──────────────────────────────────────
function renderMemberForm(container, session) {
  body(container).innerHTML = `
    <h2 class="att-title">Already a Member</h2>
    <p class="att-sub">Enter the phone number you registered with.</p>
    <form id="att-form">
      <div class="att-field">
        <label for="att-phone">Phone Number</label>
        <input type="tel" id="att-phone" placeholder="+233 XX XXX XXXX"
               inputmode="tel" autocomplete="tel" required>
      </div>
      <p class="att-err" id="att-err" style="display:none;"></p>
      <button type="submit" class="att-btn" id="att-btn">Mark Attendance</button>
    </form>
    <button class="att-btn att-btn-ghost" id="att-back">← Back</button>`;

  container.querySelector('#att-back').addEventListener('click', () => renderChoice(container, session));

  container.querySelector('#att-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone   = container.querySelector('#att-phone').value.trim();
    const errEl   = container.querySelector('#att-err');
    const btn     = container.querySelector('#att-btn');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Checking…';

    try {
      const res  = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, phone, device_id: getDeviceId() })
      });
      const data = await res.json();

      if (data.device)        { renderState(container, 'device-blocked', { session }); return; }
      if (res.status === 409) { renderState(container, 'already-marked', { session }); return; }
      if (data.not_found)     { renderState(container, 'not-found', { session }); return; }
      if (data.success)       { renderState(container, 'success', { name: data.name }); return; }

      errEl.textContent = data.error || 'Something went wrong.';
      errEl.style.display = '';
    } catch {
      errEl.textContent = 'Network error — please try again.';
      errEl.style.display = '';
    }
    btn.disabled = false; btn.textContent = 'Mark Attendance';
  });
}

// ── State: new member registration form ────────────────────────────────────
function renderNewMemberForm(container, session) {
  body(container).innerHTML = `
    <h2 class="att-title">Join FGCM</h2>
    <p class="att-sub">Fill in your details. Your attendance will be marked automatically.</p>
    <form id="att-form" autocomplete="on">
      <div class="att-row-2">
        <div class="att-field">
          <label>First Name <span class="att-req">*</span></label>
          <input type="text" name="first_name" maxlength="120"
                 autocomplete="given-name" placeholder="Kofi" required>
        </div>
        <div class="att-field">
          <label>Middle Name</label>
          <input type="text" name="middle_name" maxlength="120"
                 autocomplete="additional-name" placeholder="Optional">
        </div>
      </div>
      <div class="att-row-2">
        <div class="att-field">
          <label>Last Name <span class="att-req">*</span></label>
          <input type="text" name="last_name" maxlength="120"
                 autocomplete="family-name" placeholder="Mensah" required>
        </div>
        <div class="att-field">
          <label>Email Address <span class="att-req">*</span></label>
          <input type="email" name="email" maxlength="254"
                 autocomplete="email" inputmode="email"
                 placeholder="you@example.com" required>
        </div>
      </div>
      <div class="att-row-2">
        <div class="att-field">
          <label>Phone Number <span class="att-req">*</span></label>
          <input type="tel" name="phone" maxlength="32"
                 autocomplete="tel" inputmode="tel"
                 placeholder="+233 XX XXX XXXX" required>
        </div>
        <div class="att-field">
          <label>Gender <span class="att-req">*</span></label>
          <select name="gender" required>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>
      <div class="att-row-2">
        <div class="att-field">
          <label>Date of Birth <span class="att-req">*</span></label>
          <input type="date" name="date_of_birth" required>
        </div>
        <div class="att-field">
          <label>Residential Address / Hostel <span class="att-req">*</span></label>
          <input type="text" name="address" maxlength="500"
                 autocomplete="street-address"
                 placeholder="e.g. Hall 7, Room 42B" required>
        </div>
      </div>
      <div class="att-field">
        <label>Department of Interest <span class="att-req">*</span></label>
        <select name="department" required>
          <option value="">Select department…</option>
          <option value="Choir">Choir / Worship Team</option>
          <option value="Ushering">Ushering &amp; Protocol</option>
          <option value="Media">Media &amp; Technical</option>
          <option value="Prayer">Prayer &amp; Intercession</option>
          <option value="Evangelism">Evangelism &amp; Outreach</option>
        </select>
      </div>
      <p class="att-err" id="att-err" style="display:none;"></p>
      <button type="submit" class="att-btn" id="att-btn">Register &amp; Mark Attendance</button>
    </form>
    <button class="att-btn att-btn-ghost" id="att-back">← Back</button>`;

  container.querySelector('#att-back').addEventListener('click', () => renderChoice(container, session));

  container.querySelector('#att-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form  = e.target;
    const errEl = container.querySelector('#att-err');
    const btn   = container.querySelector('#att-btn');
    const f     = (n) => form.elements[n]?.value?.trim() ?? '';

    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const res  = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:    session.id,
          device_id:     getDeviceId(),
          first_name:    f('first_name'),
          middle_name:   f('middle_name'),
          last_name:     f('last_name'),
          email:         f('email'),
          phone:         f('phone'),
          gender:        f('gender'),
          date_of_birth: f('date_of_birth'),
          address:       f('address'),
          department:    f('department')
        })
      });
      const data = await res.json();

      if (data.device)          { renderState(container, 'device-blocked', { session }); return; }
      if (data.already_member)  { renderState(container, 'already-member', { session, ...data }); return; }
      if (res.status === 409)   { renderState(container, 'already-marked', { session }); return; }
      if (data.success)         { renderState(container, 'success', { name: data.name, isNew: true }); return; }

      errEl.textContent   = data.error || 'Something went wrong.';
      errEl.style.display = '';
    } catch {
      errEl.textContent   = 'Network error — please try again.';
      errEl.style.display = '';
    }
    btn.disabled = false; btn.textContent = 'Register & Mark Attendance';
  });
}

// ── Shared state renderer ──────────────────────────────────────────────────
function renderState(container, state, ctx = {}) {
  if (state === 'no-session') {
    body(container).innerHTML = `
      <div class="att-icon">🕐</div>
      <h2 class="att-title">No Open Session</h2>
      <p class="att-sub">There is no attendance session open right now.<br>Please wait until one is opened.</p>`;
    return;
  }
  if (state === 'net-error') {
    body(container).innerHTML = `
      <div class="att-icon">⚠️</div>
      <h2 class="att-title">Connection Error</h2>
      <p class="att-sub">Could not reach the server. Check your internet and refresh.</p>`;
    return;
  }
  if (state === 'success') {
    body(container).innerHTML = `
      <div class="att-icon">${ctx.isNew ? '🎉' : '✅'}</div>
      <h2 class="att-title">${ctx.isNew ? 'Welcome to FGCM!' : 'Attendance Marked!'}</h2>
      <p class="att-sub">
        ${ctx.isNew ? 'You\'ve been registered and your attendance recorded. ' : ''}
        Welcome, <strong>${escapeHtml(ctx.name)}</strong>!<br>God bless you.
      </p>`;
    return;
  }
  if (state === 'already-marked') {
    body(container).innerHTML = `
      <div class="att-icon">☑️</div>
      <h2 class="att-title">Already Recorded</h2>
      <p class="att-sub">Your attendance for <strong>${escapeHtml(ctx.session.label)}</strong> is already marked. See you in service!</p>`;
    return;
  }
  if (state === 'device-blocked') {
    body(container).innerHTML = `
      <div class="att-icon">🔒</div>
      <h2 class="att-title">Device Already Used</h2>
      <p class="att-sub">This phone has already been used to mark attendance for <strong>${escapeHtml(ctx.session.label)}</strong>.<br>Each device can only mark once per session.</p>`;
    return;
  }
  if (state === 'not-found') {
    body(container).innerHTML = `
      <div class="att-icon">🔍</div>
      <h2 class="att-title">Phone Not Found</h2>
      <p class="att-sub">That number isn't in our members database. Are you new to FGCM?</p>
      <button class="att-btn" id="att-goto-new">Register as New Member</button>
      <button class="att-btn att-btn-ghost" id="att-back">← Try a Different Number</button>`;
    container.querySelector('#att-goto-new').addEventListener('click', () => renderNewMemberForm(container, ctx.session));
    container.querySelector('#att-back').addEventListener('click',     () => renderMemberForm(container, ctx.session));
    return;
  }
  if (state === 'already-member') {
    const hint = ctx.hint === 'email'
      ? 'That email address is already registered.'
      : 'That phone number is already in our system.';
    body(container).innerHTML = `
      <div class="att-icon">👤</div>
      <h2 class="att-title">Already Registered</h2>
      <p class="att-sub">${escapeHtml(hint)} Use <strong>"Already a Member"</strong> and enter your phone number to mark attendance.</p>
      <button class="att-btn" id="att-goto-member">Mark as Existing Member</button>
      <button class="att-btn att-btn-ghost" id="att-back">← Back</button>`;
    container.querySelector('#att-goto-member').addEventListener('click', () => renderMemberForm(container, ctx.session));
    container.querySelector('#att-back').addEventListener('click',        () => renderNewMemberForm(container, ctx.session));
    return;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function body(container) { return container.querySelector('#att-body'); }

function buildShell(bodyHTML) {
  return `
    <section class="att-page">
      <div class="att-card">
        <img src="/images/FGCI LOGO.png" alt="FGCM-KNUST" class="att-logo">
        <div id="att-body">${bodyHTML}</div>
      </div>
    </section>`;
}

function injectStyles(container) {
  const existing = document.getElementById('att-styles');
  if (existing) return;
  const s = document.createElement('style');
  s.id = 'att-styles';
  s.textContent = `
    .att-page {
      min-height: 80vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 1.5rem 1rem 3rem;
      background: var(--color-bg-alt);
    }
    .att-card {
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 10px 48px rgba(0,0,0,0.13);
      padding: 2rem 1.75rem;
      width: 100%;
      max-width: 480px;
      text-align: center;
    }
    .att-logo {
      width: 56px; height: 56px;
      object-fit: contain;
      margin: 0 auto 1.25rem;
      display: block;
    }
    .att-icon  { font-size: 2.75rem; margin-bottom: 0.6rem; }
    .att-title { font-size: 1.3rem; font-weight: 700; color: var(--color-dark); margin: 0 0 0.3rem; }
    .att-sub   { color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.55; margin: 0 0 1.5rem; }

    /* Two-button choice screen */
    .att-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .att-choice-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      padding: 1.1rem 0.75rem;
      border: 2px solid #e5e7eb; border-radius: 12px;
      background: #fff; cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      pointer-events: auto;
    }
    .att-choice-btn:hover { border-color: var(--color-gold); box-shadow: 0 4px 16px rgba(197,151,62,0.15); }
    .att-choice-icon { font-size: 1.75rem; }
    .att-choice-btn strong { font-size: 0.9rem; color: var(--color-dark); }
    .att-choice-hint { font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.3; }

    /* Form layout */
    .att-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 420px) { .att-row-2 { grid-template-columns: 1fr; } }

    .att-field { margin-bottom: 0.9rem; text-align: left; }
    .att-field label { display: block; font-weight: 600; font-size: 0.82rem; margin-bottom: 0.35rem; color: var(--color-dark); }
    .att-req { color: #dc2626; }
    .att-field input,
    .att-field select {
      width: 100%; padding: 0.7rem 0.9rem;
      border: 2px solid #e5e7eb; border-radius: 8px;
      font-size: 0.95rem; outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      background: #fff; color: var(--color-dark);
      pointer-events: auto;
    }
    .att-field input:focus,
    .att-field select:focus { border-color: var(--color-gold); }

    .att-err { color: #dc2626; font-size: 0.85rem; margin: -0.4rem 0 0.75rem; text-align: left; }

    .att-btn {
      width: 100%; padding: 0.875rem;
      background: var(--color-gold); color: #000;
      border: none; border-radius: 8px;
      font-size: 0.95rem; font-weight: 700;
      cursor: pointer; margin-top: 0.25rem;
      transition: opacity 0.2s, transform 0.15s;
      pointer-events: auto;
    }
    .att-btn + .att-btn { margin-top: 0.5rem; }
    .att-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .att-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .att-btn-ghost {
      background: transparent;
      border: 2px solid #e5e7eb;
      color: var(--color-text-muted);
    }

    .att-loader { padding: 2.5rem 0; }
    .att-spinner {
      width: 38px; height: 38px;
      border: 3px solid #e5e7eb;
      border-top-color: var(--color-gold);
      border-radius: 50%;
      animation: att-spin 0.75s linear infinite;
      margin: 0 auto;
    }
    @keyframes att-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}
