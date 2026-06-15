import { showToast } from '../components/toast.js';
import { attachValidation, Validators, sanitizeInputString } from '../utils/validation.js';
import { mountTurnstile } from '../utils/turnstile.js';

export async function Register(container) {
  const html = `
    <section class="section position-relative overflow-hidden register-hero" style="min-height: calc(100vh - 80px); display: flex; align-items: center;">
      <div class="container position-relative" style="z-index: 2;">
        <div class="grid grid-2 gap-4 items-center">

          <div data-reveal="true" data-reveal-direction="right" class="text-white">
            <h1 class="display mb-1 text-white">Join the Family</h1>
            <p style="font-size: 1.1rem; max-width: 450px; opacity: 0.9;">
              Take the next step in your spiritual journey. Register to become a full member of FGCM and plug into a department.
            </p>
            <ul class="mt-3 flex flex-col gap-1 text-small" style="opacity: 0.9;">
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Access to discipleship classes</li>
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Serve in a department</li>
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Receive pastoral care and counseling</li>
            </ul>
          </div>

          <div data-reveal="true" data-reveal-direction="left">
            <div class="card p-4 shadow-lg" style="background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);">
              <form id="register-form" class="flex flex-col" novalidate autocomplete="on">
                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">First Name *</label>
                    <input type="text" name="first_name" class="form-control" maxlength="120" autocomplete="given-name" placeholder="John" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Middle Name</label>
                    <input type="text" name="middle_name" class="form-control" maxlength="120" autocomplete="additional-name" placeholder="Kofi" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);">
                  </div>
                </div>

                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Last Name *</label>
                    <input type="text" name="last_name" class="form-control" maxlength="120" autocomplete="family-name" placeholder="Doe" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Email Address *</label>
                    <input type="email" name="email" class="form-control" maxlength="254" autocomplete="email" inputmode="email" placeholder="john.doe@example.com" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                </div>

                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Phone Number *</label>
                    <input type="tel" name="phone" class="form-control" maxlength="32" autocomplete="tel" inputmode="tel" placeholder="055 123 4567" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Gender *</label>
                    <select name="gender" class="form-control" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                      <option value="" style="color: black;">Select...</option>
                      <option value="Male" style="color: black;">Male</option>
                      <option value="Female" style="color: black;">Female</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small font-semibold text-white">Date of Birth *</label>
                    <input type="date" name="date_of_birth" class="form-control" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                </div>

                <div class="form-group mb-2">
                  <label class="form-label text-small font-semibold text-white">Residential Address / Hostel *</label>
                  <input type="text" name="address" class="form-control" maxlength="500" autocomplete="street-address" placeholder="e.g. Hall 7, Room 42B" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label text-small font-semibold text-white">Department of Interest *</label>
                  <select name="department" class="form-control" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                    <option value="" style="color: black;">Select department...</option>
                    <option value="Choir" style="color: black;">Choir / Worship Team</option>
                    <option value="Ushering" style="color: black;">Ushering & Protocol</option>
                    <option value="Media" style="color: black;">Media & Technical</option>
                    <option value="Prayer" style="color: black;">Prayer & Intercession</option>
                    <option value="Evangelism" style="color: black;">Evangelism & Outreach</option>
                  </select>
                </div>

                <div id="register-captcha" class="mb-2"></div>

                <button type="submit" id="submit-btn" class="btn btn-gold w-full flex justify-center items-center gap-1 shadow-gold hover-lift">
                  <span>Complete Registration</span>
                  <i data-lucide="arrow-right"></i>
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('submit-btn');

  const validation = attachValidation(form, {
    first_name: Validators.name,
    middle_name: Validators.optionalName,
    last_name: Validators.name,
    email: Validators.email,
    phone: Validators.phoneGhana,
    gender: Validators.oneOf(['Male', 'Female']),
    date_of_birth: Validators.date,
    address: Validators.address,
    department: Validators.oneOf(['Choir', 'Ushering', 'Media', 'Prayer', 'Evangelism'])
  });

  // Mount Turnstile in the background — do NOT await here. Cloudflare Web
  // Analytics flagged /register at P75 = 37s because the page render was
  // blocked waiting for challenges.cloudflare.com on slow 3G connections.
  // The promise is awaited inside submit, by which time it has long resolved.
  const captchaPromise = mountTurnstile(document.getElementById('register-captcha'), { theme: 'dark' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateAll()) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const values = validation.getValues();
    const captcha = await captchaPromise;
    const captchaToken = captcha ? await captcha.getToken() : null;
    if (captcha && captcha.enabled && !captchaToken) {
      showToast('Please complete the CAPTCHA.', 'error');
      return;
    }

    const payload = {
      first_name: sanitizeInputString(values.first_name, 120),
      middle_name: sanitizeInputString(values.middle_name, 120),
      last_name: sanitizeInputString(values.last_name, 120),
      email: sanitizeInputString(values.email, 254),
      phone: sanitizeInputString(values.phone, 32),
      gender: sanitizeInputString(values.gender, 32),
      date_of_birth: values.date_of_birth ? String(values.date_of_birth) : null,
      address: sanitizeInputString(values.address, 500),
      department: sanitizeInputString(values.department, 200),
      captchaToken
    };

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="loader-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block;"></span> Processing...`;
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast('Registration successful! Welcome to the family.', 'success');
        form.reset();
        setTimeout(() => { window.appNavigate('/'); }, 2000);
      } else {
        if (res.status === 429) {
          showToast(result.error || 'Too many attempts. Please try again later.', 'error');
        } else {
          showToast(result.error || 'Registration failed. Please try again.', 'error');
        }
        if (captcha && captcha.reset) captcha.reset();
      }
    } catch (err) {
      console.error(err);
      showToast('A network error occurred. Please try again.', 'error');
      if (captcha && captcha.reset) captcha.reset();
    } finally {
      submitBtn.innerHTML = originalBtnHTML;
      submitBtn.disabled = false;
      if (window.lucide) lucide.createIcons({ root: submitBtn });
    }
  });
}
