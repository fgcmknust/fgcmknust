import './index.css';
// Installs window.lucide with a tree-shaken icon set (replaces the full CDN
// library). Imported first so the global is ready before any page renders.
import './utils/icons.js';
import { Router } from './utils/router.js';
import { Animations } from './utils/animations.js';
import { installNavStateDelegate } from './utils/nav-state.js';
import { ADMIN_ROUTES } from './config/admin-path.js';

// Components — needed for every page, kept in the main bundle.
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer } from './components/cart-drawer.js';

// Pages are loaded lazily so the initial bundle only contains the shell.
// Cloudflare Web Analytics flagged P75 Processing = 2.4s on mobile because
// every visitor downloaded code for all 12 pages (admin, register, store,
// product, etc.) before the first paint. With per-route dynamic imports
// each page becomes its own chunk and the Service Worker caches it after
// first navigation.
const lazy = (loader, exportName) =>
  (container, ctx) => loader().then((m) => m[exportName](container, ctx));

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

// Define Routes — each entry resolves its page module on demand.
const routes = {
  '/': lazy(() => import('./pages/home.js'), 'Home'),
  '/events': lazy(() => import('./pages/events.js'), 'Events'),
  '/store': lazy(() => import('./pages/store.js'), 'Store'),
  '/product': lazy(() => import('./pages/product.js'), 'Product'),
  '/register': lazy(() => import('./pages/register.js'), 'Register'),
  '/event-registration': lazy(() => import('./pages/event-registration.js'), 'EventRegistration'),
  '/cart': lazy(() => import('./pages/cart.js'), 'Cart'),
  '/checkout-manual': lazy(() => import('./pages/checkout-manual.js'), 'CheckoutManual'),
  '/payment-status': lazy(() => import('./pages/payment-status.js'), 'PaymentStatus'),
  // Admin routes live under a private slug (see src/config/admin-path.js).
  // Visitors hitting /admin, /admin/login, /wp-admin, /administrator, etc. just
  // see the public 404 — the portal isn't discoverable from path-scanning.
  [ADMIN_ROUTES.login]:     lazy(() => import('./pages/admin/login.js'),            'AdminLogin'),
  [ADMIN_ROUTES.dashboard]: lazy(() => import('./pages/admin/dashboard.js'),        'AdminDashboard'),
  [ADMIN_ROUTES.events]:    lazy(() => import('./pages/admin/events-manager.js'),   'EventsManager'),
  [ADMIN_ROUTES.products]:  lazy(() => import('./pages/admin/products-manager.js'), 'ProductsManager'),
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

// Register the service worker once the page is idle so it never competes with
// the first paint or the LCP image download. On repeat visits the SW serves
// hashed assets and images from cache, giving an instant load even on 3G.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Wait an extra tick so the SW install doesn't fight the hero image fetch.
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* SW is a progressive enhancement */ });
    }, 0);
  });
}

// ---------- Content protection ----------
// CSS already disables text selection everywhere except form fields. Add
// listener-level guards so Ctrl/Cmd-C, right-click "Save image", and drag
// don't bypass the policy on browsers that allow programmatic selection.
// Form inputs are exempted so users can still type, paste, and submit.
function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;
  return false;
}

document.addEventListener('copy', (e) => {
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
});
document.addEventListener('cut', (e) => {
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
});
document.addEventListener('contextmenu', (e) => {
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
});
document.addEventListener('dragstart', (e) => {
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
});

// Start Application
document.addEventListener('DOMContentLoaded', () => {
  installNavStateDelegate();
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
