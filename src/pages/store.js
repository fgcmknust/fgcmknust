import { renderHero } from '../components/hero.js';
import { renderProductCard } from '../components/product-card.js';
import { escapeHtml } from '../utils/helpers.js';
import { productsData } from '../data/products.js';
import { Animations } from '../utils/animations.js';

export async function Store(container) {
  let allProducts = productsData;
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      allProducts = await res.json();
    }
  } catch(e) {
    console.error('API failed, using fallback data');
  }

  // Use merch.jpg (present in public/images) and match home hero behavior
  const heroHTML = renderHero({
    title: '',
    subtitle: '',
    bgImage: '/images/merch.jpg',
    mobileBgImage: '/images/mobile-store.jpg',
    height: 'auto; aspect-ratio: 16 / 9',
    mobileHeight: 'var(--mobile-vh, 100vh)',
    mobileBgSize: 'cover',
    mobileBgPosition: 'center center',
    overlayOpacity: 0.1
  });

  const displayedProducts = Array.isArray(allProducts) ? allProducts : [];
  const categories = ['All', ...new Set(displayedProducts.map(p => p.category))];

  const html = `
    ${heroHTML}
    
    <section class="section bg-bg">
      <div class="container">
        
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
           <!-- Filters -->
           <div class="flex gap-1 overflow-x-auto pb-1" data-reveal="true">
              ${categories.map((cat, i) => `
                <button class="store-filter-btn btn btn-sm ${i === 0 ? 'bg-dark text-white border-dark' : 'btn-outline'}" 
                        data-filter="${escapeHtml(cat)}" style="border-radius: var(--radius-full); padding: 0.4rem 1rem;">
                  ${escapeHtml(cat)}
                </button>
              `).join('')}
           </div>
           
           <p class="text-small text-muted mb-0" id="product-count">${displayedProducts.length} Products</p>
        </div>

        <!-- Product Grid -->
        <div id="store-grid" class="grid grid-4 gap-2">
          ${displayedProducts.map(p => renderProductCard(p)).join('')}
        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });
  Animations.initScrollReveals(container);

  // Initialize premium hero animations similar to home page
  const bg = container.querySelector('#hero-parallax-bg');
  if (bg) Animations.premiumHero(bg, []);

  // Filter Logic
  const filterBtns = container.querySelectorAll('.store-filter-btn');
  const storeGrid = document.getElementById('store-grid');
  const countLabel = document.getElementById('product-count');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'store-filter-btn btn btn-sm btn-outline';
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text)';
      });
      btn.className = 'store-filter-btn btn btn-sm bg-dark text-white border-dark';

      const filter = btn.dataset.filter;
      const filtered = filter === 'All' ? displayedProducts : displayedProducts.filter(p => p.category === filter);

      countLabel.textContent = `${filtered.length} Products`;
      storeGrid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
      
      if (window.lucide) lucide.createIcons({ root: storeGrid });
      attachQuickAddListeners();
      attachArticleClickListeners();
      
      if (window.gsap) {
        gsap.fromTo(storeGrid.children, 
          { y: 20, opacity: 0 }, 
          { y: 0, opacity: 1, stagger: 0.05, duration: 0.3, ease: 'power2.out' }
        );
      }
    });
  });

  function attachQuickAddListeners() {
    const quickAddBtns = container.querySelectorAll('.quick-add-btn');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        const product = displayedProducts.find(p => p.id === id);
        if (product) {
          const { CartStore } = await import('../utils/cart-store.js');
          const { showToast } = await import('../components/toast.js');
          CartStore.addItem(product, product.sizes[0], 1, (product.colors && product.colors[0]) || null);
          showToast(`Added ${product.name} to cart!`, 'success');
          window.dispatchEvent(new CustomEvent('open-cart-drawer'));
        }
      });
    });
  }

  attachQuickAddListeners();
  attachArticleClickListeners();

  function attachArticleClickListeners() {
    const articles = container.querySelectorAll('.product-card');
    articles.forEach(article => {
      article.addEventListener('click', (e) => {
        if (e.target.closest('.quick-add-btn')) return;
        const id = article.dataset.id;
        if (id) {
          try { sessionStorage.setItem('nav:productId', id); } catch (err) {}
          window.appNavigate('/product');
        }
      });
    });
  }
}
