import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { eventsData } from '../data/events.js';
import { getDummyEventImage } from '../utils/helpers.js';
import { attachValidation, Validators, sanitizeInputString } from '../utils/validation.js';
import { mountTurnstile } from '../utils/turnstile.js';
import { getNavState } from '../utils/nav-state.js';

export async function EventRegistration(container) {
  let allEvents = eventsData;
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      allEvents = await res.json();
      allEvents.forEach(ev => ev.image = getDummyEventImage(ev.id));
    }
  } catch (e) {
    console.error('API failed, using fallback data');
  }

  // eventId is passed via sessionStorage so it doesn't leak into the address bar.
  const initialEventId = getNavState('eventId') || '';

  const targetEvent = allEvents.find(e => e.id === initialEventId);

  const imageFromHero = sessionStorage.getItem('eventHeroImage') || '';
  sessionStorage.removeItem('eventHeroImage');

  let eventSelectionHTML = '';
  let sectionStyle = `min-height: calc(100vh - 80px); display: flex; align-items: center;`;
  let overlayHTML = '';
  const textColorClass = 'text-white';
  const textMutedClass = 'text-white opacity-80';

  if (initialEventId) {
    const eventTitle = targetEvent ? targetEvent.title : 'Special Event';
    const eventDateStr = targetEvent && targetEvent.date
      ? ` (${new Date(targetEvent.date).toLocaleDateString()})`
      : '';

    eventSelectionHTML = `
      <div class="form-group mb-2">
        <label class="form-label text-small font-semibold text-white">Event</label>
        <input type="hidden" name="event_id" value="${escapeHtml(initialEventId)}">
        <div class="p-3 rounded mb-0" style="font-weight: 500; background: rgba(255, 255, 255, 0.15); color: white; border: 1px solid rgba(255, 255, 255, 0.2);">
          ${escapeHtml(eventTitle)}${escapeHtml(eventDateStr)}
        </div>
      </div>
    `;

    const rawImage = imageFromHero || (targetEvent && targetEvent.image) || '/images/Keepers.jpg';
    const safeImage = String(rawImage).replace(/['"\\\s)<>]/g, '');
    const eventImage = encodeURI(safeImage);
    sectionStyle += ` background-image: url('${eventImage}'); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: scroll;`;
    overlayHTML = `<div class="position-absolute" style="top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.75); z-index: 1;"></div>`;
  } else {
    const eventOptions = allEvents
      .map(event => {
        const dateStr = event.date ? new Date(event.date).toLocaleDateString() : '';
        return `<option value="${escapeHtml(event.id)}" style="color: black;">${escapeHtml(event.title)} ${escapeHtml(dateStr ? `(${dateStr})` : '')}</option>`;
      }).join('');

    eventSelectionHTML = `
      <div class="form-group mb-2">
        <label class="form-label text-small font-semibold text-white">Select Event *</label>
        <select name="event_id" class="form-control" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
          <option value="" disabled selected style="color: black;">-- Choose an event --</option>
          ${eventOptions}
        </select>
      </div>
    `;

    const defaultBgImage = '/images/Regis.jpg';
    sectionStyle += ` background-image: url('${defaultBgImage}'); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: scroll;`;
    overlayHTML = `<div class="position-absolute" style="top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.75); z-index: 1;"></div>`;
  }

  const html = `
    <section class="section bg-bg position-relative overflow-hidden" style="${sectionStyle}">
      ${overlayHTML}

      <div class="container position-relative" style="z-index: 2;">
        <div class="grid grid-2 gap-4 items-center">

          <div data-reveal="true" data-reveal-direction="right">
            <h1 class="display mb-1 ${textColorClass}">Event Registration</h1>
            <p class="${textMutedClass}" style="font-size: 1.1rem; max-width: 450px;">
              Secure your spot for our upcoming events and programs. We can't wait to see you!
            </p>
            <ul class="mt-3 flex flex-col gap-1 ${textMutedClass} text-small">
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Receive event reminders and updates</li>
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Fast-track check-in at the venue</li>
               <li class="flex items-center gap-1"><i data-lucide="check-circle-2" class="text-gold"></i> Access event-specific resources</li>
            </ul>
          </div>

          <div data-reveal="true" data-reveal-direction="left">
            <div class="card p-4 shadow-lg" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
              <form id="event-register-form" class="flex flex-col" novalidate autocomplete="on">

                ${eventSelectionHTML}

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
                    <input type="email" name="email" class="form-control" maxlength="254" autocomplete="email" inputmode="email" placeholder="john@example.com" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                  </div>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label text-small font-semibold text-white">Phone Number *</label>
                  <input type="tel" name="phone" class="form-control" maxlength="32" autocomplete="tel" inputmode="tel" placeholder="055 123 4567" style="background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.4);" required>
                </div>

                <div id="event-captcha" class="mb-2"></div>

                <button type="submit" id="submit-btn" class="btn btn-gold w-full flex justify-center items-center gap-1 shadow-gold hover-lift">
                  <span>Register for Event</span>
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

  const form = document.getElementById('event-register-form');
  const submitBtn = document.getElementById('submit-btn');

  const validation = attachValidation(form, {
    event_id: Validators.required,
    first_name: Validators.name,
    middle_name: Validators.optionalName,
    last_name: Validators.name,
    email: Validators.email,
    phone: Validators.phoneGhana
  });

  const captcha = await mountTurnstile(document.getElementById('event-captcha'), { theme: 'dark' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validation.validateAll()) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const captchaToken = captcha ? await captcha.getToken() : null;
    if (captcha && captcha.enabled && !captchaToken) {
      showToast('Please complete the CAPTCHA.', 'error');
      return;
    }

    const values = validation.getValues();
    const selectedEvent = allEvents.find(e => e.id === values.event_id);
    const eventName = selectedEvent ? selectedEvent.title : '';
    const payload = {
      event_id: sanitizeInputString(values.event_id, 128),
      event_name: sanitizeInputString(eventName, 256),
      first_name: sanitizeInputString(values.first_name, 120),
      middle_name: sanitizeInputString(values.middle_name, 120),
      last_name: sanitizeInputString(values.last_name, 120),
      email: sanitizeInputString(values.email, 254),
      phone: sanitizeInputString(values.phone, 32),
      captchaToken
    };

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '';
    const spinner = document.createElement('span');
    spinner.className = 'loader-spinner';
    spinner.style.cssText = 'width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 8px;';
    submitBtn.appendChild(spinner);
    const txt = document.createElement('span');
    txt.textContent = 'Processing...';
    submitBtn.appendChild(txt);

    try {
      const res = await fetch('/api/register-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast('Successfully registered for the event!', 'success');
        form.reset();
        setTimeout(() => { window.appNavigate('/events'); }, 2000);
      } else {
        if (res.status === 429) {
          showToast(result.error || 'Too many attempts. Please try again later.', 'error');
        } else {
          showToast(result.error || 'Registration failed. Please try again.', 'error');
        }
        if (captcha) captcha.reset();
      }
    } catch (err) {
      console.error(err);
      showToast('A network error occurred. Please try again.', 'error');
      if (captcha) captcha.reset();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
      if (window.lucide) lucide.createIcons({ root: submitBtn });
    }
  });
}
