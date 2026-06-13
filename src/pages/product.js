import { productsData } from '../data/products.js';
import { formatGHS, escapeHtml } from '../utils/helpers.js';

export async function Product(container, { params }) {
  let products = productsData;
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const apiProducts = await res.json();
      if (Array.isArray(apiProducts) && apiProducts.length > 0) products = apiProducts;
    }
  } catch (e) {
    // Fall back to static productsData.
  }

  const product = products.find(p => p.id === params.id);

  if (!product) {
    container.innerHTML = `
      <section class="section text-center">
        <div class="container">
          <h2>Product Not Found</h2>
          <p class="text-muted">The item you are looking for does not exist.</p>
          <a href="/store" class="btn btn-gold mt-2">Back to Store</a>
        </div>
      </section>
    `;
    return;
  }

  const html = `
    <section class="section">
      <div class="container">
        <div class="grid grid-2 gap-4 items-start">
          
          <!-- Image Gallery (Simplified to single image for now) -->
          <div class="product-gallery position-relative bg-bg-alt rounded flex justify-center items-center" style="height: 500px; padding: 2rem;" data-reveal="true" data-reveal-direction="right">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-full" style="object-fit: contain;">
          </div>

          <!-- Product Details -->
          <div class="product-info" data-reveal="true" data-reveal-direction="left">
            <span class="badge mb-2">${escapeHtml(product.category)}</span>
            <h1 class="mb-1">${escapeHtml(product.name)}</h1>
            <p class="text-gold font-bold display mb-2" style="font-size: 2rem;">${formatGHS(product.price)}</p>
            
            <p class="text-muted mb-3" style="font-size: 1.1rem; line-height: 1.8;">${escapeHtml(product.description)}</p>
            
            <div class="form-group mb-3">
              <label class="form-label font-bold">Select Size</label>
              <div class="flex gap-1 flex-wrap">
                ${(product.sizes || []).map((size, i) => `
                  <button class="size-btn btn btn-outline ${i===0 ? 'border-gold text-gold bg-gold-light opacity-10' : ''}"
                          data-size="${escapeHtml(size)}" style="border-radius: var(--radius-sm); min-width: 3rem;">
                    ${escapeHtml(size)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Choose Colour</label>
              <div class="flex gap-1 flex-wrap">
                ${product.colors && product.colors.map((col, i) => `
                  <button class="color-btn btn btn-outline ${i===0 ? 'border-gold text-gold bg-gold-light opacity-10' : ''}"
                          data-color="${escapeHtml(col)}" style="border-radius: var(--radius-sm); min-width: 3rem;">
                    ${escapeHtml(col)}
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="form-group mb-4">
              <label class="form-label font-bold">Quantity</label>
              <div class="flex items-center gap-2">
                <div class="flex items-center border rounded" style="width: fit-content; border-color: #E5E5E5;">
                  <button id="qty-minus" class="px-2 py-1 text-muted hover-gold" style="background:none; border:none; cursor:pointer;">-</button>
                  <input type="number" id="qty-input" value="1" min="1" max="10" class="text-center border-none font-bold" style="width: 3rem; background: transparent; outline: none;">
                  <button id="qty-plus" class="px-2 py-1 text-muted hover-gold" style="background:none; border:none; cursor:pointer;">+</button>
                </div>
              </div>
            </div>
            
            <button id="add-to-cart-btn" class="btn btn-gold w-full flex items-center justify-center gap-1 shadow-gold hover-lift" style="padding: 1rem;">
              <i data-lucide="shopping-bag"></i> Add to Cart
            </button>
          </div>
          
        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });

  if (window.gsap && window.Animations) {
    Animations.initScrollReveals(container);
  }

  // Interactive Logic
  let selectedSize = (product.sizes && product.sizes[0]) || null;
  let selectedColor = (product.colors && product.colors[0]) || null;
  let quantity = 1;

  const sizeBtns = container.querySelectorAll('.size-btn');
  const qtyInput = document.getElementById('qty-input');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const addToCartBtn = document.getElementById('add-to-cart-btn');

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => {
        b.className = 'size-btn btn btn-outline';
        b.style.borderColor = 'var(--color-text-muted)';
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text)';
      });
      btn.className = 'size-btn btn btn-outline';
      btn.style.borderColor = 'var(--color-gold)';
      btn.style.background = 'rgba(197, 151, 62, 0.1)';
      btn.style.color = 'var(--color-gold)';
      selectedSize = btn.dataset.size;
    });
  });

  const colorBtns = container.querySelectorAll('.color-btn');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => {
        b.className = 'color-btn btn btn-outline';
        b.style.borderColor = 'var(--color-text-muted)';
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text)';
      });
      btn.className = 'color-btn btn btn-outline';
      btn.style.borderColor = 'var(--color-gold)';
      btn.style.background = 'rgba(197, 151, 62, 0.1)';
      btn.style.color = 'var(--color-gold)';
      selectedColor = btn.dataset.color;
    });
  });

  qtyMinus.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      qtyInput.value = quantity;
    }
  });

  qtyPlus.addEventListener('click', () => {
    if (quantity < 10) {
      quantity++;
      qtyInput.value = quantity;
    }
  });

  qtyInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    quantity = val;
    qtyInput.value = quantity;
  });

  addToCartBtn.addEventListener('click', async () => {
    const { CartStore } = await import('../utils/cart-store.js');
    const { showToast } = await import('../components/toast.js');
    
    CartStore.addItem(product, selectedSize, quantity, selectedColor);
    showToast(`Added ${quantity} ${product.name} to cart!`, 'success');
    window.dispatchEvent(new CustomEvent('open-cart-drawer'));
  });
}
