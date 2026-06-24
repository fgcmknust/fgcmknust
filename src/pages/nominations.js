import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

const ROLES = [
  'President',
  'Vice President',
  'General Secretary',
  'Financial Secretary',
  'Prayer Secretary',
  'Assistant Prayer Secretary',
  'Organising Secretary',
  'Assistant Organising Secretary',
  'Evangelism Secretary',
  'Music Director',
  'Assistant Music Director',
  'Media and Publicity Head',
  'Assistant Media and Publicity Head',
  "Men's Wing",
  "Women's Wing",
  'Agape Head',
  'Visitors Head',
  'Bible Studies Head',
  'Ushering Head',
  'Assistant Ushering Head',
];

const STATEMENT_MAX = 500;
const STATEMENT_MIN = 20;
const INPUT_STYLE  = 'background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);';
const LABEL_CLASS  = 'form-label text-small font-semibold text-white';

export function Nominations(container) {
  container.innerHTML = `
    <section class="section position-relative overflow-hidden nominations-hero" style="min-height: calc(100vh - 80px); display: flex; align-items: center;">
      <div class="container position-relative" style="z-index: 2;">
        <div class="grid grid-2 gap-4 items-center">

          <div data-reveal="true" data-reveal-direction="right" class="text-white">
            <h1 class="display mb-1 text-white">Step Up &amp; Serve</h1>
            <p style="font-size: 1.1rem; max-width: 450px; opacity: 0.9;">
              Express your interest in a leadership role within FGCM-KNUST. Fill in your details and let us know why you're the right person for the position.
            </p>
            <ul class="mt-3 flex flex-col gap-1 text-small" style="opacity: 0.9; list-style: none; padding: 0;">
              <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Open to all committed members</li>
              <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> One submission per role</li>
              <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> All submissions reviewed by the leadership</li>
            </ul>
          </div>

          <div data-reveal="true" data-reveal-direction="left">
            <div class="card p-4 shadow-lg" style="background: rgba(255,255,255,0.12); backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.25);">

              <div id="nom-form-wrap">
                <div class="form-group mb-2">
                  <label class="${LABEL_CLASS}">Nominator's Name</label>
                  <input type="text" id="nom-nominator" class="form-control" placeholder="Optional — who is submitting this nomination?" maxlength="120" autocomplete="name" style="${INPUT_STYLE}">
                </div>

                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="${LABEL_CLASS}">Nominee First Name *</label>
                    <input type="text" id="nom-first-name" class="form-control" placeholder="John" maxlength="120" autocomplete="given-name" style="${INPUT_STYLE}">
                  </div>
                  <div class="form-group mb-0">
                    <label class="${LABEL_CLASS}">Nominee Middle Name</label>
                    <input type="text" id="nom-middle-name" class="form-control" placeholder="Optional" maxlength="120" autocomplete="additional-name" style="${INPUT_STYLE}">
                  </div>
                </div>

                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="${LABEL_CLASS}">Nominee Last Name *</label>
                    <input type="text" id="nom-last-name" class="form-control" placeholder="Doe" maxlength="120" autocomplete="family-name" style="${INPUT_STYLE}">
                  </div>
                  <div class="form-group mb-0">
                    <label class="${LABEL_CLASS}">Nominee Phone Number *</label>
                    <input type="tel" id="nom-phone" class="form-control" placeholder="055 123 4567" maxlength="32" inputmode="tel" autocomplete="tel" style="${INPUT_STYLE}">
                  </div>
                </div>

                <div class="form-group mb-2">
                  <label class="${LABEL_CLASS}">Nominee Email Address *</label>
                  <input type="email" id="nom-email" class="form-control" placeholder="you@example.com" maxlength="254" inputmode="email" autocomplete="email" style="${INPUT_STYLE}">
                </div>

                <div class="form-group mb-2">
                  <label class="${LABEL_CLASS}">Position *</label>
                  <select id="nom-role" class="form-control" style="${INPUT_STYLE}">
                    <option value="" style="color:black;">-- Select a position --</option>
                    ${ROLES.map(r => `<option value="${escapeHtml(r)}" style="color:black;">${escapeHtml(r)}</option>`).join('')}
                  </select>
                </div>

                <div class="form-group mb-3">
                  <label class="${LABEL_CLASS}">Why is the nominee suitable for this role? *</label>
                  <textarea id="nom-statement" class="form-control" rows="4" maxlength="${STATEMENT_MAX}"
                    placeholder="Briefly describe why the nominee is suitable for this position…"
                    style="${INPUT_STYLE} resize: vertical; min-height: 100px;"></textarea>
                  <div style="display:flex; justify-content:space-between; margin-top:0.25rem;">
                    <span id="nom-stmt-hint" class="text-small" style="color:rgba(255,255,255,0.65);">Minimum ${STATEMENT_MIN} characters</span>
                    <span id="nom-stmt-count" class="text-small" style="color:rgba(255,255,255,0.65);">0 / ${STATEMENT_MAX}</span>
                  </div>
                </div>

                <button id="nom-submit" class="btn btn-gold w-full flex justify-center items-center gap-1 shadow-gold hover-lift">
                  <span>Submit Nomination</span>
                  <i data-lucide="arrow-right"></i>
                </button>
              </div>

              <div id="nom-success" style="display:none; text-align:center; padding: 2rem 0;">
                <i data-lucide="check-circle-2" style="width:56px;height:56px;color:var(--color-gold);margin-bottom:1rem;"></i>
                <h3 class="mb-1 text-white">Nomination Submitted!</h3>
                <p class="text-small mb-0" style="color:rgba(255,255,255,0.85);" id="nom-success-msg"></p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  `;

  if (window.lucide) lucide.createIcons({ root: container });

  const nominatorEl  = document.getElementById('nom-nominator');
  const firstNameEl  = document.getElementById('nom-first-name');
  const middleNameEl = document.getElementById('nom-middle-name');
  const lastNameEl   = document.getElementById('nom-last-name');
  const phoneEl      = document.getElementById('nom-phone');
  const emailEl      = document.getElementById('nom-email');
  const roleEl       = document.getElementById('nom-role');
  const statementEl  = document.getElementById('nom-statement');
  const stmtCount    = document.getElementById('nom-stmt-count');
  const stmtHint     = document.getElementById('nom-stmt-hint');
  const submitBtn    = document.getElementById('nom-submit');
  const formWrap     = document.getElementById('nom-form-wrap');
  const successEl    = document.getElementById('nom-success');
  const successMsg   = document.getElementById('nom-success-msg');

  function markError(el, msg) {
    el.style.borderColor = '#fc8181';
    el.title = msg;
    el.focus();
  }
  function clearError(el) {
    el.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    el.title = '';
  }

  [nominatorEl, firstNameEl, middleNameEl, lastNameEl, phoneEl, emailEl, roleEl, statementEl].forEach(el =>
    el.addEventListener('input', () => clearError(el))
  );

  statementEl.addEventListener('input', () => {
    const len = statementEl.value.length;
    stmtCount.textContent = `${len} / ${STATEMENT_MAX}`;
    if (len >= STATEMENT_MIN) {
      stmtCount.style.color = 'var(--color-gold)';
      stmtHint.style.display = 'none';
    } else {
      stmtCount.style.color = 'rgba(255,255,255,0.65)';
      stmtHint.style.display = '';
    }
  });

  submitBtn.addEventListener('click', async () => {
    const nominator_name = nominatorEl.value.trim() || null;
    const first_name  = firstNameEl.value.trim();
    const middle_name = middleNameEl.value.trim() || null;
    const last_name   = lastNameEl.value.trim();
    const phone       = phoneEl.value.trim();
    const email       = emailEl.value.trim();
    const role        = roleEl.value;
    const statement   = statementEl.value.trim();

    if (!first_name)                      { markError(firstNameEl,  'First name is required');                            return; }
    if (!last_name)                       { markError(lastNameEl,   'Last name is required');                             return; }
    if (!phone)                           { markError(phoneEl,       'Phone number is required');                          return; }
    if (!email)                           { markError(emailEl,       'Email is required');                                 return; }
    if (!role)                            { markError(roleEl,        'Please select a position');                          return; }
    if (statement.length < STATEMENT_MIN) { markError(statementEl,   `Please write at least ${STATEMENT_MIN} characters`); return; }
    if (statement.length > STATEMENT_MAX) { markError(statementEl,   `Maximum ${STATEMENT_MAX} characters allowed`);       return; }

    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loader-spinner" style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span> Submitting…`;

    try {
      const res = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominator_name,
          nominee_first_name:  first_name,
          nominee_middle_name: middle_name,
          nominee_last_name:   last_name,
          nominee_phone:       phone,
          nominee_email:       email,
          role,
          statement,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.duplicate) {
        showToast(data.error || 'You already nominated for this role.', 'info');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        if (window.lucide) lucide.createIcons({ root: submitBtn });
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'Submission failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        if (window.lucide) lucide.createIcons({ root: submitBtn });
        return;
      }

      formWrap.style.display = 'none';
      successMsg.textContent = `Thank you, ${first_name}! Your nomination for ${role} has been received.`;
      successEl.style.display = 'block';
      if (window.lucide) lucide.createIcons({ root: successEl });
    } catch {
      showToast('Network error. Please check your connection and try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
      if (window.lucide) lucide.createIcons({ root: submitBtn });
    }
  });
}
