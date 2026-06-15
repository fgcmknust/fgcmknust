import { CartStore } from '../utils/cart-store.js';
import { formatGHS, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { mountTurnstile } from '../utils/turnstile.js';
import { computeChargeBreakdown } from '../utils/fees.js';

// Static payment instructions — kept in one place for easy editing.
const MOMO_NUMBER = '0530460088';
const MOMO_NAME = 'Kekeli Abena Serwaa Djandjoe / Full Gospel Campus Ministry-KNUST';
const MOMO_REFERENCE = 'Keepers Of The Flame T-shirt';

const MAX_PROOF_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function CheckoutManual(container) {
  const items = CartStore.getItems();
  let customer = null;
  try {
    const raw = sessionStorage.getItem('checkoutCustomer');
    if (raw) customer = JSON.parse(raw);
  } catch (e) { customer = null; }

  // Block the page if the user landed here without completing /cart.
  if (items.length === 0 || !customer || !customer.email) {
    container.innerHTML = `
      <section class="section text-center" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h2>Checkout Session Expired</h2>
        <p class="text-muted mb-3">Please start your order from the cart again.</p>
        <a href="/cart" class="btn btn-gold">Back to Cart</a>
      </section>
    `;
    return;
  }

  const subtotal = CartStore.getTotal();
  const charge = computeChargeBreakdown(subtotal);

  container.innerHTML = `
    <section class="section bg-bg-alt pb-4">
      <div class="container">
        <h1 class="mb-1">Complete Your Payment</h1>
        <p class="text-muted mb-0">Send the total via Mobile Money, then upload your transaction screenshot below.</p>
      </div>
    </section>

    <section class="section pt-0" style="margin-top: -2rem;">
      <style>
        .manual-layout { display: grid; gap: 2rem; grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          .manual-layout { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
        }
        .copy-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .copy-row .copy-btn {
          background: var(--color-gold-light); color: var(--color-dark); border: none;
          padding: 0.25rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem;
          font-weight: 600; cursor: pointer; flex-shrink: 0;
        }
        .copy-row .copy-btn:hover { background: var(--color-gold); color: white; }

        /* ---------- Important red notice ---------- */
        .important-notice {
          position: relative;
          padding: 1rem 1rem 1rem 3rem;
          border-radius: var(--radius-md);
          background: rgba(211, 47, 47, 0.08);
          border: 1px solid rgba(211, 47, 47, 0.35);
          border-left: 5px solid var(--color-error);
          color: #8a1f1f;
          box-shadow: 0 2px 8px rgba(211, 47, 47, 0.10);
        }
        .important-notice .badge-dot {
          position: absolute; top: 1rem; left: 0.85rem;
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--color-error); color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.95rem;
          box-shadow: 0 2px 6px rgba(211, 47, 47, 0.35);
        }
        .important-notice strong { color: var(--color-error); }
        .important-notice .ref-pill {
          display: inline-block;
          padding: 0.05rem 0.5rem;
          margin: 0 0.15rem;
          border-radius: 999px;
          background: rgba(211, 47, 47, 0.15);
          color: var(--color-error);
          font-weight: 700;
        }

        /* ---------- Redesigned upload dropzone ---------- */
        #proof-input { display: none; }
        .proof-dropzone {
          position: relative;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 220px;
          border: 2px dashed var(--color-text-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          background:
            radial-gradient(circle at top, rgba(197,151,62,0.06), transparent 60%),
            var(--color-surface);
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .proof-dropzone:hover {
          border-color: var(--color-gold);
          box-shadow: 0 6px 24px rgba(197,151,62,0.12);
        }
        .proof-dropzone.is-dragging {
          border-color: var(--color-gold);
          background: rgba(197,151,62,0.08);
          transform: scale(1.01);
        }
        .proof-dropzone.has-file {
          border-style: solid;
          border-color: var(--color-success);
          background: rgba(45, 138, 78, 0.04);
        }
        .proof-dropzone.is-invalid {
          border-color: var(--color-error);
          background: rgba(211, 47, 47, 0.05);
          animation: shake 0.35s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .proof-icon-wrap {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--color-bg-alt);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.75rem;
        }
        .proof-icon-wrap i { width: 32px; height: 32px; color: var(--color-gold); }
        .proof-title { font-weight: 700; font-size: 1.05rem; margin: 0; }
        .proof-sub { font-size: 0.8rem; color: var(--color-text-muted); margin: 0.15rem 0 0; }
        .proof-pill {
          display: inline-block; margin-top: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: var(--color-gold); color: white;
          border-radius: 999px;
          font-size: 0.75rem; font-weight: 600;
        }
        .proof-required {
          display: inline-block;
          color: var(--color-error);
          font-weight: 700;
          margin-left: 0.25rem;
        }
        .proof-preview {
          max-width: 100%;
          max-height: 320px;
          border-radius: var(--radius-sm);
          margin-top: 0.5rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .proof-success-bar {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.85rem; margin-top: 0.5rem;
          background: var(--color-success); color: white;
          border-radius: 999px;
          font-size: 0.78rem; font-weight: 600;
        }
        .proof-change-link {
          display: inline-block; margin-top: 0.4rem;
          color: var(--color-gold-dark); font-weight: 600; font-size: 0.85rem;
          text-decoration: underline;
        }

        .btn[disabled] {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
      </style>

      <div class="container">
        <div class="manual-layout">

          <div class="flex flex-col gap-3">

            <div class="card p-3 shadow-sm" data-reveal="true" data-reveal-direction="up">
              <h3 class="border-b pb-2 mb-2 font-body">Payment Instructions</h3>

              <div class="bg-bg-alt p-3 rounded mb-2">
                <div class="copy-row mb-2">
                  <div>
                    <p class="text-small text-muted mb-0">MoMo Number</p>
                    <p class="font-bold mb-0" style="font-size: 1.15rem;" id="momo-number">${escapeHtml(MOMO_NUMBER)}</p>
                  </div>
                  <button type="button" class="copy-btn" data-copy="${escapeHtml(MOMO_NUMBER)}">Copy</button>
                </div>
                <div class="copy-row mb-2 pt-2 border-t">
                  <div>
                    <p class="text-small text-muted mb-0">Account Name</p>
                    <p class="font-bold mb-0">${escapeHtml(MOMO_NAME)}</p>
                  </div>
                </div>
                <div class="copy-row pt-2 border-t">
                  <div>
                    <p class="text-small text-muted mb-0">Transaction Reference</p>
                    <p class="font-bold mb-0" style="color: var(--color-gold-dark);">${escapeHtml(MOMO_REFERENCE)}</p>
                  </div>
                  <button type="button" class="copy-btn" data-copy="${escapeHtml(MOMO_REFERENCE)}">Copy</button>
                </div>
              </div>

              <div class="important-notice" role="alert">
                <span class="badge-dot" aria-hidden="true">!</span>
                <p class="text-small mb-0" style="line-height: 1.55;">
                  <strong>IMPORTANT — Read carefully:</strong>
                  When sending payment, you <strong>MUST</strong> use
                  <span class="ref-pill">${escapeHtml(MOMO_REFERENCE)}</span>
                  as the reference / narration. Without this exact reference we cannot match
                  your transfer to your order and your purchase will not be confirmed.
                </p>
              </div>
            </div>

            <div class="card p-3 shadow-sm" data-reveal="true" data-reveal-direction="up" data-reveal-delay="0.1">
              <h3 class="border-b pb-2 mb-2 font-body">
                Upload Transaction Screenshot
                <span class="proof-required" aria-label="required">* required</span>
              </h3>
              <p class="text-small text-muted mb-3">
                After paying, upload a clear screenshot of the MoMo confirmation message
                (JPG, PNG, WEBP or GIF, up to 8 MB). This is required to complete your purchase.
              </p>

              <label for="proof-input" class="proof-dropzone" id="proof-dropzone">
                <div id="proof-empty">
                  <div class="proof-icon-wrap">
                    <i data-lucide="upload-cloud"></i>
                  </div>
                  <p class="proof-title">Click to upload or drag &amp; drop</p>
                  <p class="proof-sub">Screenshot of your MoMo confirmation</p>
                  <span class="proof-pill">Choose file</span>
                </div>
                <div id="proof-loaded" style="display: none;">
                  <img id="proof-preview" class="proof-preview" alt="Transaction screenshot preview">
                  <div class="proof-success-bar">
                    <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                    <span id="proof-name"></span>
                  </div>
                  <div>
                    <a href="#" id="proof-change" class="proof-change-link">Replace screenshot</a>
                  </div>
                </div>
              </label>
              <input type="file" id="proof-input" accept="image/jpeg,image/png,image/webp,image/gif" required>

              <div id="manual-captcha" class="mt-2"></div>
            </div>

          </div>

          <div data-reveal="true" data-reveal-direction="left" data-reveal-delay="0.2">
            <div class="card p-3 shadow-md position-sticky" style="top: 100px;">
              <h3 class="border-b pb-2 mb-2 font-body">Order Summary</h3>

              <div class="cart-items flex flex-col gap-1 mb-2 pb-2 border-b">
                ${items.map(item => `
                  <div class="flex justify-between text-small">
                    <span>${escapeHtml(item.name)} ${item.size ? '(' + escapeHtml(item.size) + ')' : ''} × ${Number(item.quantity)}</span>
                    <span class="font-bold">${formatGHS(item.price * item.quantity)}</span>
                  </div>
                `).join('')}
              </div>

              <div class="flex justify-between mb-1 text-small pb-2 border-b">
                <span class="text-muted">Subtotal</span>
                <span class="font-bold">${formatGHS(subtotal)}</span>
              </div>
              <div class="flex justify-between items-center mt-2 mb-3">
                <span class="font-bold text-dark">Total Due</span>
                <span class="font-bold text-gold" style="font-size: 1.5rem;">${formatGHS(subtotal)}</span>
              </div>

              <button id="confirm-btn" class="btn btn-gold w-full flex justify-center items-center gap-1 shadow-gold" disabled aria-disabled="true">
                <i data-lucide="check"></i> <span id="confirm-btn-label">Upload screenshot to confirm</span>
              </button>
              <p class="text-small text-muted text-center mt-1 mb-0" id="confirm-hint">
                The button activates once you've added your transaction screenshot.
              </p>
              <a href="/cart" class="text-small text-muted text-center block mt-2">← Edit cart / details</a>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;

  if (window.lucide) lucide.createIcons({ root: container });

  // Background-mount Turnstile so render isn't blocked on /api/config.
  const captchaPromise = mountTurnstile(document.getElementById('manual-captcha'), { theme: 'light' });

  // --- Copy buttons ----------------------------------------------------------
  container.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch (e) {
        showToast('Copy failed — please copy manually.', 'error');
      }
    });
  });

  // --- Proof upload UI -------------------------------------------------------
  const proofInput = document.getElementById('proof-input');
  const dropzone = document.getElementById('proof-dropzone');
  const emptyView = document.getElementById('proof-empty');
  const loadedView = document.getElementById('proof-loaded');
  const previewImg = document.getElementById('proof-preview');
  const nameEl = document.getElementById('proof-name');
  const confirmBtn = document.getElementById('confirm-btn');
  const confirmHint = document.getElementById('confirm-hint');
  let proofFile = null;

  function setConfirmEnabled(enabled) {
    // Re-query the label each call — setBtnLoading() rebuilds the button's
    // inner DOM on submit, so the original reference can go stale.
    const lbl = document.getElementById('confirm-btn-label');
    if (enabled) {
      confirmBtn.disabled = false;
      confirmBtn.removeAttribute('aria-disabled');
      if (lbl) lbl.textContent = 'Confirm Purchase';
      if (confirmHint) confirmHint.style.display = 'none';
    } else {
      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-disabled', 'true');
      if (lbl) lbl.textContent = 'Upload screenshot to confirm';
      if (confirmHint) confirmHint.style.display = 'block';
    }
  }

  function showProof(file) {
    proofFile = file;
    nameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    const reader = new FileReader();
    reader.onload = (e) => { previewImg.src = e.target.result; };
    reader.readAsDataURL(file);
    emptyView.style.display = 'none';
    loadedView.style.display = 'block';
    dropzone.classList.add('has-file');
    dropzone.classList.remove('is-invalid');
    setConfirmEnabled(true);
  }

  function clearProof() {
    proofFile = null;
    proofInput.value = '';
    emptyView.style.display = 'flex';
    emptyView.style.flexDirection = 'column';
    emptyView.style.alignItems = 'center';
    loadedView.style.display = 'none';
    dropzone.classList.remove('has-file');
    setConfirmEnabled(false);
  }

  function flagInvalid() {
    dropzone.classList.add('is-invalid');
    setTimeout(() => dropzone.classList.remove('is-invalid'), 600);
  }

  function acceptFile(file) {
    if (!file) return;
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      showToast('Please upload a JPG, PNG, WEBP, or GIF image.', 'error');
      flagInvalid();
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      showToast('Screenshot is larger than 8 MB. Please choose a smaller image.', 'error');
      flagInvalid();
      return;
    }
    showProof(file);
  }

  proofInput.addEventListener('change', () => acceptFile(proofInput.files[0]));

  document.getElementById('proof-change').addEventListener('click', (e) => {
    e.preventDefault();
    clearProof();
    proofInput.click();
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) acceptFile(file);
  });

  // --- Confirm submission ----------------------------------------------------
  // (confirmBtn / confirmLabel were captured above so we can flip enabled state
  // from the upload handlers.)

  function setBtnLoading(loading) {
    confirmBtn.disabled = loading;
    confirmBtn.innerHTML = '';
    if (loading) {
      const spinner = document.createElement('span');
      spinner.className = 'loader-spinner';
      spinner.style.cssText = 'width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 8px;';
      confirmBtn.appendChild(spinner);
      const txt = document.createElement('span');
      txt.textContent = 'Submitting...';
      confirmBtn.appendChild(txt);
    } else {
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'check');
      icon.style.marginRight = '8px';
      confirmBtn.appendChild(icon);
      const txt = document.createElement('span');
      txt.id = 'confirm-btn-label';
      txt.textContent = 'Confirm Purchase';
      confirmBtn.appendChild(txt);
      if (window.lucide) lucide.createIcons({ root: confirmBtn });
    }
  }

  confirmBtn.addEventListener('click', async () => {
    // Belt-and-suspenders: the button is also disabled by the upload handler,
    // but a stray click via keyboard could still fire — shake the dropzone if
    // there's no file yet so the user knows where to act.
    if (!proofFile) {
      showToast('Please upload your transaction screenshot before confirming.', 'error');
      flagInvalid();
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const captcha = await captchaPromise;
    const captchaToken = captcha ? await captcha.getToken() : null;
    if (captcha && captcha.enabled && !captchaToken) {
      showToast('Please complete the CAPTCHA.', 'error');
      return;
    }

    setBtnLoading(true);

    const form = new FormData();
    form.append('proof', proofFile);
    form.append('data', JSON.stringify({
      ...customer,
      items: CartStore.getItems(),
      captchaToken
    }));

    try {
      const res = await fetch('/api/pay/manual-confirm', { method: 'POST', body: form });
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* ignore */ }

      if (!res.ok) {
        showToast(data.error || 'Could not submit your payment. Please try again.', 'error');
        if (captcha && captcha.reset) captcha.reset();
        setBtnLoading(false);
        // If the server says the cart is stale, bounce the user back to /cart
        // where the prune logic runs automatically.
        if (data.code === 'STALE_CART') {
          setTimeout(() => window.appNavigate('/cart'), 1500);
        }
        return;
      }

      CartStore.clear();
      try { sessionStorage.removeItem('checkoutCustomer'); } catch (e) { /* ignore */ }

      const params = new URLSearchParams({ manual: '1' });
      if (data.reference) params.set('reference', data.reference);
      window.appNavigate(`/payment-status?${params.toString()}`);
    } catch (err) {
      console.error(err);
      showToast('Network error — please try again.', 'error');
      if (captcha && captcha.reset) captcha.reset();
      setBtnLoading(false);
    }
  });
}
