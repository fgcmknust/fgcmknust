import { CartStore } from '../utils/cart-store.js';
import { formatGHS, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { attachValidation, Validators, sanitizeInputString } from '../utils/validation.js';
import { mountTurnstile } from '../utils/turnstile.js';
import { computeChargeBreakdown } from '../utils/fees.js';

export async function Cart(container) {
  const items = CartStore.getItems();

  if (items.length === 0) {
    container.innerHTML = `
      <section class="section text-center" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <i data-lucide="shopping-cart" class="text-muted mb-2" style="width: 64px; height: 64px; opacity: 0.3;"></i>
        <h2>Your Cart is Empty</h2>
        <p class="text-muted mb-3">Looks like you haven't added any merch to your cart yet.</p>
        <a href="/store" class="btn btn-gold hover-lift">Browse Store</a>
      </section>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  const subtotal = CartStore.getTotal();
  const charge = computeChargeBreakdown(subtotal);

  const html = `
    <section class="section bg-bg-alt pb-4">
      <div class="container">
        <h1 class="mb-3">Secure Checkout</h1>
      </div>
    </section>

    <section class="section pt-0" style="margin-top: -2rem;">
      <style>
        .cart-layout { display: grid; gap: 2rem; grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          .cart-layout { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
        }
      </style>
      <div class="container">
        <div class="cart-layout">

          <div class="checkout-left flex flex-col gap-3">

            <div class="card p-3 shadow-sm" data-reveal="true" data-reveal-direction="up">
              <h3 class="border-b pb-2 mb-2 font-body">Order Summary</h3>
              <div class="cart-items flex flex-col gap-2">
                ${items.map(item => `
                  <div class="cart-item flex gap-2 items-center pb-2 border-b">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="bg-bg-alt rounded" loading="lazy" decoding="async" style="width: 80px; height: 80px; object-fit: contain; padding: 0.25rem;">
                    <div class="flex-1">
                      <h4 class="text-small mb-0 font-body">${escapeHtml(item.name)}</h4>
                      <p class="text-muted text-small mb-0">Size: ${escapeHtml(item.size)}${item.color ? ' • Colour: ' + escapeHtml(item.color) : ''}</p>
                    </div>
                    <div class="text-right">
                      <p class="font-bold mb-0">${formatGHS(item.price * item.quantity)}</p>
                      <p class="text-muted text-small mb-0">Qty: ${Number(item.quantity)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card p-3 shadow-sm" data-reveal="true" data-reveal-direction="up" data-reveal-delay="0.1">
              <h3 class="border-b pb-2 mb-2 font-body">Your Details</h3>
              <form id="checkout-form" novalidate autocomplete="on">
                <div class="grid grid-3 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small">First Name *</label>
                    <input type="text" name="first_name" id="cust_first_name" class="form-control" maxlength="120" autocomplete="given-name" required>
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small">Middle Name</label>
                    <input type="text" name="middle_name" id="cust_middle_name" class="form-control" maxlength="120" autocomplete="additional-name">
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small">Last Name *</label>
                    <input type="text" name="last_name" id="cust_last_name" class="form-control" maxlength="120" autocomplete="family-name" required>
                  </div>
                </div>
                <div class="grid grid-2 gap-2 mb-2">
                  <div class="form-group mb-0">
                    <label class="form-label text-small">Email Address *</label>
                    <input type="email" name="email" id="cust_email" class="form-control" maxlength="254" autocomplete="email" inputmode="email" required>
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-small">Phone (MoMo Number) *</label>
                    <input type="tel" name="phone" id="cust_phone" class="form-control" maxlength="32" autocomplete="tel" inputmode="tel" required>
                  </div>
                </div>
                <div id="checkout-captcha" class="mb-1"></div>
              </form>
            </div>

          </div>

          <div class="checkout-right" data-reveal="true" data-reveal-direction="left" data-reveal-delay="0.2">
            <div class="card p-3 shadow-md position-sticky" style="top: 100px;">
              <h3 class="border-b pb-2 mb-2 font-body">Payment</h3>

              <div class="flex justify-between items-center mb-1 text-small">
                <span class="text-muted">Subtotal</span>
                <span class="font-bold">${formatGHS(subtotal)}</span>
              </div>
              <div class="flex justify-between items-center mb-1 text-small">
                <span class="text-muted">Charges</span>
                <span class="font-bold" id="charge-fee">${formatGHS(charge.fee)}</span>
              </div>
              <div class="flex justify-between items-center mb-2 pb-2 border-b text-small">
                <span class="text-muted">Delivery</span>
                <span class="text-muted">Calculated post-purchase</span>
              </div>

              <div class="flex justify-between items-center mb-4">
                <span class="font-bold text-dark">Total to Pay</span>
                <span class="font-bold text-gold" id="charge-total" style="font-size: 1.5rem;">${formatGHS(charge.total)}</span>
              </div>

              <div class="payment-methods mb-3 p-2 bg-bg-alt rounded text-center">
                <p class="text-small text-muted mb-1">Pay securely with Mobile Money or Card</p>
                <div class="flex justify-center gap-1 opacity-50">
                  <span class="text-small font-bold">MTN</span> •
                  <span class="text-small font-bold">Telecel</span> •
                  <span class="text-small font-bold">AT</span> •
                  <span class="text-small font-bold">Visa</span>
                </div>
              </div>

              <button id="pay-btn" class="btn btn-gold w-full flex justify-center items-center gap-1 shadow-gold">
                <i data-lucide="lock" class="icon-sm"></i> Pay Now
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });

  const payBtn = document.getElementById('pay-btn');
  const form = document.getElementById('checkout-form');

  const validation = attachValidation(form, {
    first_name: Validators.name,
    middle_name: Validators.optionalName,
    last_name: Validators.name,
    email: Validators.email,
    phone: Validators.phoneGhana
  });

  const captcha = await mountTurnstile(document.getElementById('checkout-captcha'), { theme: 'light' });

  function setPayButtonLoading(btn, loading, text = 'Pay Now') {
    if (loading) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '';
      const spinner = document.createElement('span');
      spinner.className = 'loader-spinner';
      spinner.style.cssText = 'width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 8px;';
      btn.appendChild(spinner);
      const txt = document.createElement('span');
      txt.textContent = 'Processing...';
      btn.appendChild(txt);
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'lock');
      icon.className = 'icon-sm';
      icon.style.marginRight = '8px';
      btn.appendChild(icon);
      const txt = document.createElement('span');
      txt.textContent = text;
      btn.appendChild(txt);
      if (window.lucide) lucide.createIcons({ root: btn });
    }
  }

  payBtn.addEventListener('click', async () => {
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
    const first_name = sanitizeInputString(values.first_name, 120);
    const middle_name = sanitizeInputString(values.middle_name, 120);
    const last_name = sanitizeInputString(values.last_name, 120);
    const email = sanitizeInputString(values.email, 254);
    const phone = sanitizeInputString(values.phone, 32);
    const displayName = [first_name, middle_name, last_name].filter(Boolean).join(' ');

    setPayButtonLoading(payBtn, true);

    try {
      const initRes = await fetch('/api/pay/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name,
          middle_name,
          last_name,
          phone,
          items: CartStore.getItems(),
          captchaToken
        })
      });

      let initData = null;
      const raw = await initRes.text();
      try { initData = raw ? JSON.parse(raw) : {}; } catch (e) { initData = {}; }

      if (!initRes.ok) {
        const message = (initData && initData.error) || 'Failed to initialize payment';
        if (initRes.status === 429) {
          showToast(message, 'error');
        } else {
          showToast(message, 'error');
        }
        if (captcha) captcha.reset();
        setPayButtonLoading(payBtn, false);
        return;
      }

      const serverAmount = Number(initData.amount);
      const serverReference = initData.reference;
      if (!Number.isFinite(serverAmount) || !serverReference) {
        throw new Error('Invalid initialization response');
      }

      const handler = PaystackPop.setup({
        key: initData.publicKey,
        email,
        amount: Math.round(serverAmount * 100),
        currency: 'GHS',
        ref: serverReference,
        metadata: {
          custom_fields: [
            { display_name: 'Name', variable_name: 'name', value: displayName },
            { display_name: 'Phone', variable_name: 'phone', value: phone }
          ]
        },
        callback: function(response) {
          window.appNavigate(`/payment-status?reference=${encodeURIComponent(response.reference)}`);
        },
        onClose: function() {
          showToast('Payment window closed.', 'info');
          setPayButtonLoading(payBtn, false);
        }
      });

      handler.openIframe();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Payment initialization failed', 'error');
      if (captcha) captcha.reset();
      setPayButtonLoading(payBtn, false);
    }
  });
}
