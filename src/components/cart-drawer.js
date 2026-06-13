import { CartStore } from '../utils/cart-store.js';
import { formatGHS } from '../utils/helpers.js';

export function renderCartDrawer() {
  // If it already exists, don't recreate
  if (document.getElementById('cart-drawer')) return;

  const drawerHTML = `
    <!-- Backdrop -->
    <div id="cart-backdrop" class="position-fixed w-full h-full" 
         style="top: 0; left: 0; background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;">
    </div>
    
    <!-- Drawer -->
    <div id="cart-drawer" class="position-fixed bg-white flex flex-col"
         style="top: 0; right: 0; width: 100%; max-width: 400px; height: 100vh; height: 100dvh; z-index: 101; transform: translateX(100%); display: none; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: none; padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box;">
      
      <!-- Header -->
      <div class="drawer-header p-3 border-b flex justify-between items-center" style="border-bottom: 1px solid #eee;">
        <h3 class="mb-0 flex items-center gap-1 font-body">
          <i data-lucide="shopping-bag" class="text-gold"></i> Your Cart (<span id="drawer-count">0</span>)
        </h3>
        <button id="close-drawer" class="btn btn-outline" style="padding: 0.5rem; border: none;">
          <i data-lucide="x"></i>
        </button>
      </div>
      
      <!-- Body (Items) -->
      <div id="drawer-items" class="drawer-body p-3 flex-1 overflow-y-auto">
        <!-- Items injected here by renderDrawerItems() -->
      </div>
      
      <!-- Footer (Total & Checkout) -->
      <div class="drawer-footer p-3 bg-bg-alt" style="background: var(--color-bg-alt); border-top: 1px solid #eee;">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-muted">Subtotal</span>
          <span id="drawer-total" class="font-bold text-gold" style="font-size: 1.25rem;">GH₵ 0.00</span>
        </div>
        <p class="text-small text-muted mb-3">Delivery charges calculated at checkout.</p>
        <div class="grid grid-2 gap-1">
          <a href="#/cart" id="btn-view-cart" class="btn btn-outline w-full text-center">View Cart</a>
          <a href="#/cart" id="btn-checkout" class="btn btn-gold w-full text-center">Checkout</a>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHTML);
  if (window.lucide) lucide.createIcons();

  const backdrop = document.getElementById('cart-backdrop');
  const drawer = document.getElementById('cart-drawer');
  const closeBtn = document.getElementById('close-drawer');

  // Open Drawer Logic
  window.addEventListener('open-cart-drawer', () => {
    // Mobile: skip the drawer entirely. The cart is shown as a full page
    // (/cart). Add-to-Cart actions still fire this event but on mobile we
    // only let the toast notify the user; the page transition is initiated
    // separately by the navbar cart button.
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) return;

    backdrop.style.opacity = '1';
    backdrop.style.pointerEvents = 'auto';
    // display:flex so the drawer participates in the layout BEFORE the
    // transform animates in. Use rAF so the browser registers the display
    // change before applying the transform.
    drawer.style.display = 'flex';
    drawer.style.boxShadow = 'var(--shadow-lg)';
    requestAnimationFrame(() => {
      drawer.style.transform = 'translateX(0)';
    });
    document.body.classList.add('no-scroll');
    updateDrawerUI();
  });

  // Close Drawer Logic
  const closeDrawer = () => {
    backdrop.style.opacity = '0';
    backdrop.style.pointerEvents = 'none';
    drawer.style.transform = 'translateX(100%)';
    // After the slide-out finishes, fully remove the drawer from the render
    // tree and drop its box-shadow so it can't leak ANY pixels at the bottom
    // of the screen on iOS (the original cause of the gold/grey strip on /cart).
    setTimeout(() => {
      drawer.style.display = 'none';
      drawer.style.boxShadow = 'none';
    }, 400);
    document.body.classList.remove('no-scroll');
  };

  backdrop.addEventListener('click', closeDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  document.getElementById('btn-view-cart').addEventListener('click', closeDrawer);
  document.getElementById('btn-checkout').addEventListener('click', closeDrawer);

  // Update UI on cart changes
  window.addEventListener('cart-updated', updateDrawerUI);
  
  // Attach event delegation for remove buttons in drawer
  document.getElementById('drawer-items').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.drawer-remove-item');
    if (removeBtn) {
      const id = removeBtn.dataset.id;
      const size = removeBtn.dataset.size;
      const color = removeBtn.dataset.color || null;
      CartStore.removeItem(id, size, color);
    }
  });

  // Initial render
  updateDrawerUI();
}

function updateDrawerUI() {
  const items = CartStore.getItems();
  const countSpan = document.getElementById('drawer-count');
  const totalSpan = document.getElementById('drawer-total');
  const itemsContainer = document.getElementById('drawer-items');
  const btnCheckout = document.getElementById('btn-checkout');

  if (countSpan) countSpan.textContent = CartStore.getCount();
  if (totalSpan) totalSpan.textContent = formatGHS(CartStore.getTotal());
  
  if (btnCheckout) {
    if (items.length === 0) {
      btnCheckout.style.opacity = '0.5';
      btnCheckout.style.pointerEvents = 'none';
    } else {
      btnCheckout.style.opacity = '1';
      btnCheckout.style.pointerEvents = 'auto';
    }
  }

  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    if (items.length === 0) {
      const emptyWrap = document.createElement('div');
      emptyWrap.className = 'h-full flex flex-col justify-center items-center text-center text-muted p-4';

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'shopping-cart');
      icon.style.cssText = 'width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;';

      const p = document.createElement('p');
      p.textContent = 'Your cart is empty.';

      const a = document.createElement('a');
      a.href = '#/store';
      a.className = 'btn btn-outline btn-sm mt-2';
      a.textContent = 'Continue Shopping';
      a.addEventListener('click', () => document.getElementById('close-drawer').click());

      emptyWrap.appendChild(icon);
      emptyWrap.appendChild(p);
      emptyWrap.appendChild(a);

      itemsContainer.appendChild(emptyWrap);
      if (window.lucide) lucide.createIcons({ root: itemsContainer });
      return;
    }

    items.forEach(item => {
      const wrap = document.createElement('div');
      wrap.className = 'drawer-item flex gap-2 mb-3 pb-3';
      wrap.style.borderBottom = '1px solid #f0f0f0';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'item-img bg-bg-alt flex justify-center items-center rounded';
      imgWrap.style.cssText = 'width: 70px; height: 70px; padding: 0.25rem;';

      const img = document.createElement('img');
      // .src / .alt are properties, not HTML — assign the raw values; the browser will not parse HTML here.
      img.src = item.image || '';
      img.alt = item.name || '';
      img.style.cssText = 'max-height: 100%; object-fit: contain;';
      imgWrap.appendChild(img);

      const details = document.createElement('div');
      details.className = 'item-details flex-1';

      const h4 = document.createElement('h4');
      h4.className = 'text-small mb-0 font-body';
      h4.style.fontWeight = '600';
      h4.style.lineHeight = '1.2';
      h4.textContent = item.name || '';

      const p = document.createElement('p');
      p.className = 'text-small text-muted mb-0';
      p.textContent = `Size: ${item.size || ''}${item.color ? ' • Colour: ' + item.color : ''}`;

      const bottom = document.createElement('div');
      bottom.className = 'flex justify-between items-center mt-1';

      const qty = document.createElement('span');
      qty.className = 'text-small';
      qty.textContent = `Qty: ${item.quantity}`;

      const price = document.createElement('span');
      price.className = 'text-gold font-bold text-small';
      price.textContent = formatGHS(item.price * item.quantity);

      bottom.appendChild(qty);
      bottom.appendChild(price);

      details.appendChild(h4);
      details.appendChild(p);
      details.appendChild(bottom);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'drawer-remove-item text-muted hover-error';
      removeBtn.style.cssText = 'background:none; border:none; cursor:pointer; padding:0 0.25rem;';
      removeBtn.dataset.id = item.id;
      removeBtn.dataset.size = item.size;
      removeBtn.dataset.color = item.color || '';
      removeBtn.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>';

      wrap.appendChild(imgWrap);
      wrap.appendChild(details);
      wrap.appendChild(removeBtn);

      itemsContainer.appendChild(wrap);
    });

    if (window.lucide) lucide.createIcons({ root: itemsContainer });
  }
}
