import { formatGHS, escapeHtml } from '../utils/helpers.js';

export function renderProductCard(product) {
  return `
    <article class="card product-card hover-lift position-relative h-full flex flex-col" 
             style="cursor: pointer;" 
             data-id="${escapeHtml(product.id)}" data-reveal="true" data-reveal-direction="up">
      <!-- Product Image -->
      <div class="product-image-container position-relative overflow-hidden bg-white flex justify-center items-center" style="height: 280px; padding: 1rem;">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-full" loading="lazy" decoding="async" style="object-fit: contain; transition: transform 0.5s ease;">
        
        <!-- Category Badge -->
        <div class="position-absolute" style="top: 1rem; left: 1rem;">
          <span class="badge" style="background: var(--color-bg-alt);">${escapeHtml(product.category)}</span>
        </div>
        
        <!-- Hover Overlay -->
        <div class="product-overlay position-absolute w-full h-full flex items-center justify-center flex-col gap-1" 
             style="background: rgba(255, 255, 255, 0.85); top: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;">
          <a href="/product" data-product-id="${escapeHtml(product.id)}" class="btn btn-gold w-full max-w-[200px]" style="max-width: 80%;">View Details</a>
          <button class="btn btn-outline w-full max-w-[200px] quick-add-btn" data-id="${escapeHtml(product.id)}" style="max-width: 80%;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Quick Add
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="product-content p-3 text-center flex flex-col flex-1" style="background: var(--color-bg-alt); border-top: 1px solid rgba(0,0,0,0.05);">
        <h3 class="product-name mb-1 font-body font-semibold" style="font-size: 1.1rem; font-family: var(--font-body);">${escapeHtml(product.name)}</h3>
        <p class="product-price text-gold font-bold mb-0 mt-auto" style="font-size: 1.15rem;">${formatGHS(product.price)}</p>
      </div>
    </article>
  `;
}
