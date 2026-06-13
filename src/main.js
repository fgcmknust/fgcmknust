import './index.css';
import { Router } from './utils/router.js';
import { Animations } from './utils/animations.js';

// Components
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer } from './components/cart-drawer.js';

// Pages
import { Home } from './pages/home.js';
import { Events } from './pages/events.js';
import { Store } from './pages/store.js';
import { Product } from './pages/product.js';
import { Register } from './pages/register.js';
import { EventRegistration } from './pages/event-registration.js';
import { Cart } from './pages/cart.js';
import { PaymentStatus } from './pages/payment-status.js';

// Admin Pages
import { AdminLogin } from './pages/admin/login.js';
import { AdminDashboard } from './pages/admin/dashboard.js';
import { EventsManager } from './pages/admin/events-manager.js';
import { ProductsManager } from './pages/admin/products-manager.js';

// Setup App Shell
function initAppShell() {
  const app = document.getElementById('app');
  
  // Create layout structure
  app.innerHTML = `
    <div id="navbar-container"></div>
    <main id="page-content" class="page-enter-active"></main>
    <div id="footer-container"></div>
  `;

  // Render static components
  renderNavbar(document.getElementById('navbar-container'));
  renderFooter(document.getElementById('footer-container'));
  renderCartDrawer();
}

function updateFooterLock() {
  // Footer lock behavior disabled per UX requirement — keep footer static
  const footer = document.querySelector('.footer');
  if (!footer) return;
  footer.classList.remove('footer-locked');
}

// Define Routes
const routes = {
  '/': Home,
  '/events': Events,
  '/store': Store,
  '/product/:id': Product,
  '/register': Register,
  '/event-registration': EventRegistration,
  '/cart': Cart,
  '/payment-status': PaymentStatus,
  '/admin/login': AdminLogin,
  '/admin': AdminDashboard,
  '/admin/events': EventsManager,
  '/admin/products': ProductsManager,
  '*': async (container) => {
    container.innerHTML = `
      <section class="section text-center flex flex-col justify-center items-center" style="min-height: 60vh;">
        <h1 class="display text-gold mb-1">404</h1>
        <h2>Page Not Found</h2>
        <p class="text-muted">The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" class="btn btn-outline mt-3">Return to Home</a>
      </section>
    `;
  }
};

// Start Application
document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  updateFooterLock();

  // rAF-throttled scroll + debounced resize to avoid layout thrashing
  let footerTicking = false;
  const onScroll = () => {
    if (!footerTicking) {
      footerTicking = true;
      requestAnimationFrame(() => { updateFooterLock(); footerTicking = false; });
    }
  };
  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateFooterLock, 120);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  
  const router = new Router(routes, async (renderFn) => {
    const container = document.getElementById('page-content');
    
    // Exit animation
    await Animations.pageExit(container);
    
    // Render new content
    await renderFn();
    
    // Enter animation
    Animations.pageEnter(container);
    updateFooterLock();
  });
});
