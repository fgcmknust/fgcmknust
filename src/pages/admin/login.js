import { showToast } from '../../components/toast.js';
import { attachValidation, sanitizeInputString } from '../../utils/validation.js';
import { mountTurnstile } from '../../utils/turnstile.js';

export async function AdminLogin(container) {
  if (sessionStorage.getItem('adminToken')) {
    window.appNavigate('/admin');
    return;
  }

  container.innerHTML = `
    <section class="section flex items-center justify-center min-h-screen" style="background: var(--color-bg-alt);">
      <div class="card p-4 w-full" style="max-width: 400px;">
        <div class="text-center mb-3">
          <img src="/images/FGCI LOGO.png" alt="FGCM Logo" style="height: 60px; margin-bottom: 1rem;">
          <h2 class="display text-gold" style="font-size: 2rem;">Admin Login</h2>
          <p class="text-muted">Access the church management dashboard</p>
        </div>

        <form id="admin-login-form" class="flex flex-col gap-2" novalidate autocomplete="off">
          <div class="form-group">
            <label for="admin-token" class="font-body font-semibold">Admin Token</label>
            <input type="password" name="admin_token" id="admin-token" class="form-control" maxlength="256" autocomplete="off" placeholder="Enter secret token" required>
          </div>

          <div id="login-captcha"></div>

          <button type="submit" class="btn btn-gold w-full mt-2">Login to Dashboard</button>
        </form>
      </div>
    </section>
  `;

  document.getElementById('navbar-container').style.display = 'none';
  document.getElementById('footer-container').style.display = 'none';

  const form = document.getElementById('admin-login-form');

  const validation = attachValidation(form, {
    admin_token: (value) => {
      const s = sanitizeInputString(value, 256);
      if (!s) return 'Required';
      if (s.length < 8) return 'Token looks too short';
      return null;
    }
  });

  const captcha = await mountTurnstile(document.getElementById('login-captcha'), { theme: 'light' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateAll()) return;

    const token = sanitizeInputString(document.getElementById('admin-token').value, 256);
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
        if (captcha) captcha.reset();
        return;
      }
      if (!res.ok) {
        showToast('Invalid admin token', 'error');
        if (captcha) captcha.reset();
        return;
      }

      sessionStorage.setItem('adminToken', token);
      showToast('Login successful', 'success');
      window.appNavigate('/admin');
    } catch (err) {
      showToast('Error validating token', 'error');
      if (captcha) captcha.reset();
    }
  });
}
