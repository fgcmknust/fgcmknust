import { CartStore } from '../utils/cart-store.js';
import { escapeHtml } from '../utils/helpers.js';

export async function PaymentStatus(container, { query }) {
  const reference = query.reference;
  const isManual = query.manual === '1';

  // Manual MoMo flow: payment is submitted with a screenshot we review later,
  // so there's nothing live to verify. Show an "awaiting review" success page.
  if (isManual) {
    container.innerHTML = `
      <section class="section text-center" style="min-height: 70vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div class="p-4 bg-white rounded shadow-lg max-w-md w-full" data-reveal="true" data-reveal-direction="up">
          <div class="mb-3 flex justify-center">
            <div class="flex items-center justify-center rounded-full" style="width: 80px; height: 80px; background-color: #E8F5E9;">
              <i data-lucide="check-circle" style="width: 40px; height: 40px; color: var(--color-success);"></i>
            </div>
          </div>
          <h2 class="mb-1 text-dark">Payment Submitted</h2>
          <p class="text-muted mb-3 text-small">Thanks! We've received your screenshot and will confirm your order once the MoMo transfer is verified. You'll get an email when your T-shirt is ready for pickup.</p>

          <div class="text-left bg-bg-alt p-3 rounded mb-4 text-small">
            ${reference ? `
              <div class="flex justify-between mb-1 pb-1 border-b">
                <span class="text-muted">Reference:</span>
                <span class="font-bold">${escapeHtml(reference)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between">
              <span class="text-muted">Status:</span>
              <span class="font-bold text-gold uppercase">Awaiting Review</span>
            </div>
          </div>

          <a href="/store" class="btn btn-gold w-full">Continue Shopping</a>
        </div>
      </section>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  if (!reference) {
    container.innerHTML = `
      <section class="section text-center" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h2>Invalid Request</h2>
        <p class="text-muted">No payment reference provided.</p>
        <a href="/" class="btn btn-gold mt-2">Return Home</a>
      </section>
    `;
    return;
  }

  // Show loading state initially
  container.innerHTML = `
    <section class="section text-center" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <div class="loader-spinner mb-3" style="width: 60px; height: 60px; border: 4px solid rgba(197, 151, 62, 0.2); border-top-color: var(--color-gold); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <h2>Verifying Payment</h2>
      <p class="text-muted">Please wait while we confirm your transaction with Hubtel...</p>
    </section>
  `;

  try {
    // Call backend verify endpoint
    const res = await fetch(`/api/pay/verify?reference=${encodeURIComponent(reference)}`);
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      // Clear cart on success
      CartStore.clear();

      container.innerHTML = `
        <section class="section text-center" style="min-height: 70vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div class="p-4 bg-white rounded shadow-lg max-w-md w-full" data-reveal="true" data-reveal-direction="up">
            <div class="mb-3 flex justify-center">
              <div class="bg-bg-alt flex items-center justify-center rounded-full" style="width: 80px; height: 80px; background-color: #E8F5E9;">
                <i data-lucide="check-circle" style="width: 40px; height: 40px; color: var(--color-success);"></i>
              </div>
            </div>
            <h2 class="mb-1 text-dark">Payment Successful!</h2>
            <p class="text-muted mb-3 text-small">Thank you for your purchase. A receipt has been sent to your email.</p>
            
            <div class="text-left bg-bg-alt p-3 rounded mb-4 text-small">
                <div class="flex justify-between mb-1 pb-1 border-b">
                <span class="text-muted">Reference:</span>
                <span class="font-bold">${escapeHtml(reference)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Status:</span>
                <span class="font-bold text-success uppercase">Paid</span>
              </div>
            </div>
            
            <a href="/store" class="btn btn-gold w-full">Continue Shopping</a>
          </div>
        </section>
      `;
    } else {
      throw new Error(data.error || 'Payment verification failed');
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <section class="section text-center" style="min-height: 70vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div class="p-4 bg-white rounded shadow-lg max-w-md w-full" data-reveal="true" data-reveal-direction="up">
          <div class="mb-3 flex justify-center">
            <div class="bg-bg-alt flex items-center justify-center rounded-full" style="width: 80px; height: 80px; background-color: #FFEBEE;">
              <i data-lucide="x-circle" style="width: 40px; height: 40px; color: var(--color-error);"></i>
            </div>
          </div>
          <h2 class="mb-1 text-dark">Payment Failed</h2>
          <p class="text-muted mb-3 text-small">We couldn't verify your payment. Your card/wallet may not have been charged.</p>
          
          <div class="text-left bg-bg-alt p-3 rounded mb-4 text-small text-error">
            ${escapeHtml(err.message || 'An error occurred')}
          </div>
          
          <div class="grid grid-2 gap-1">
             <a href="/cart" class="btn btn-outline text-center">Try Again</a>
             <a href="/contact" class="btn btn-outline text-center border-gray">Support</a>
          </div>
        </div>
      </section>
    `;
  }

  if (window.lucide) lucide.createIcons({ root: container });
  if (window.Animations) Animations.initScrollReveals(container);
}
