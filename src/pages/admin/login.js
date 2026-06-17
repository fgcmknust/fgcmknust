import { showToast } from '../../components/toast.js';
import { attachValidation, sanitizeInputString } from '../../utils/validation.js';
import { mountTurnstile } from '../../utils/turnstile.js';
import { ADMIN_ROUTES } from '../../config/admin-path.js';

export async function AdminLogin(container) {
  if (sessionStorage.getItem('adminToken')) {
    window.appNavigate(ADMIN_ROUTES.dashboard);
    return;
  }

  container.innerHTML = `
    <section class="admin-login-screen">
      <div class="admin-login-bg" aria-hidden="true"></div>

      <div class="admin-login-card">
        <div class="admin-login-brand">
          <img src="/images/FGCI LOGO.png" alt="FGCM Logo" width="56" height="56" decoding="async">
          <p class="admin-login-eyebrow">FGCM</p>
          <h1 class="admin-login-title">Admin Portal</h1>
          <p class="admin-login-sub">Restricted area — staff access only.</p>
        </div>

        <form id="admin-login-form" class="admin-login-form" novalidate autocomplete="off">
          <div class="form-group">
            <label for="admin-token" class="admin-login-label">Access Token</label>
            <div class="admin-login-input-wrap">
              <i data-lucide="key-round" class="admin-login-input-icon"></i>
              <input type="password" name="admin_token" id="admin-token" class="form-control admin-login-input"
                     maxlength="256" autocomplete="off" placeholder="Enter your secret token" required>
            </div>
          </div>

          <div id="login-captcha" class="admin-login-captcha"></div>

          <button type="submit" class="btn btn-gold w-full admin-login-btn">
            <span>Authenticate</span>
            <i data-lucide="arrow-right"></i>
          </button>

          <p class="admin-login-foot">
            This URL is private. If you reached it by accident, please leave.
          </p>
        </form>
      </div>
    </section>

    <style>
      .admin-login-screen {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.25rem;
        background: #0F0F12;
        color: #E9E4D7;
        overflow: hidden;
      }
      .admin-login-bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 20% 20%, rgba(197,151,62,0.25), transparent 45%),
          radial-gradient(circle at 80% 80%, rgba(197,151,62,0.18), transparent 50%),
          linear-gradient(180deg, #0F0F12 0%, #1A1A22 100%);
        z-index: 0;
      }
      .admin-login-card {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 420px;
        background: rgba(28, 28, 34, 0.78);
        backdrop-filter: blur(18px) saturate(160%);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        padding: 2.5rem 2rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(197,151,62,0.15) inset;
      }
      .admin-login-brand { text-align: center; margin-bottom: 1.5rem; }
      .admin-login-brand img { border-radius: 50%; background: rgba(197,151,62,0.12); padding: 6px; }
      .admin-login-eyebrow {
        margin: 0.75rem 0 0;
        color: #C5973E;
        font-size: 0.7rem;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .admin-login-title {
        font-family: var(--font-heading);
        font-size: 1.85rem;
        font-weight: 700;
        margin: 0.35rem 0 0.4rem;
        color: #fff;
      }
      .admin-login-sub {
        margin: 0;
        color: rgba(233, 228, 215, 0.6);
        font-size: 0.85rem;
      }
      .admin-login-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem; }
      .admin-login-label {
        color: rgba(233, 228, 215, 0.75);
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 600;
      }
      .admin-login-input-wrap { position: relative; }
      .admin-login-input-icon {
        position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
        width: 18px; height: 18px; color: rgba(233,228,215,0.5);
        pointer-events: none;
      }
      .admin-login-input {
        background: rgba(0,0,0,0.35) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        color: #fff !important;
        padding-left: 42px !important;
        height: 46px;
      }
      .admin-login-input::placeholder { color: rgba(233,228,215,0.4); }
      .admin-login-input:focus {
        outline: none;
        border-color: rgba(197,151,62,0.6) !important;
        box-shadow: 0 0 0 3px rgba(197,151,62,0.18);
      }
      .admin-login-captcha { display: flex; justify-content: center; min-height: 1px; }
      .admin-login-btn {
        height: 48px;
        font-size: 0.95rem;
        background: linear-gradient(135deg, #C5973E 0%, #A87A26 100%);
        box-shadow: 0 8px 24px rgba(197,151,62,0.35);
        gap: 0.5rem;
      }
      .admin-login-foot {
        margin: 0.5rem 0 0;
        text-align: center;
        font-size: 0.7rem;
        color: rgba(233,228,215,0.4);
        letter-spacing: 0.04em;
      }
    </style>
  `;

  document.getElementById('navbar-container').style.display = 'none';
  document.getElementById('footer-container').style.display = 'none';
  if (window.lucide) lucide.createIcons();

  const form = document.getElementById('admin-login-form');

  const validation = attachValidation(form, {
    admin_token: (value) => {
      const s = sanitizeInputString(value, 256);
      if (!s) return 'Required';
      if (s.length < 8) return 'Token looks too short';
      return null;
    }
  });

  // Background-mount Turnstile so initial render isn't blocked on Cloudflare's
  // challenges.cloudflare.com script.
  const captchaPromise = mountTurnstile(document.getElementById('login-captcha'), { theme: 'dark' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateAll()) return;

    const token = sanitizeInputString(document.getElementById('admin-token').value, 256);
    const captcha = await captchaPromise;
    const captchaToken = captcha ? await captcha.getToken() : null;
    if (captcha && captcha.enabled && !captchaToken) {
      showToast('Please complete the CAPTCHA.', 'error');
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (captchaToken) headers['X-Captcha-Token'] = captchaToken;

      const res = await fetch('/api/admin/verify', { headers });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Too many attempts. Try again later.', 'error');
        if (captcha && captcha.reset) captcha.reset();
        return;
      }
      if (!res.ok) {
        showToast('Invalid admin token', 'error');
        if (captcha && captcha.reset) captcha.reset();
        return;
      }

      sessionStorage.setItem('adminToken', token);
      showToast('Login successful', 'success');
      window.appNavigate(ADMIN_ROUTES.dashboard);
    } catch (err) {
      showToast('Error validating token', 'error');
      if (captcha && captcha.reset) captcha.reset();
    }
  });
}
