import { churchInfo } from '../data/church-info.js';
import { CartStore } from '../utils/cart-store.js';

export function renderNavbar(container) {
  const currentPath = (window.location.pathname + window.location.search).split('?')[0] || '/';
  
  const navHTML = `
    <header id="main-nav" class="navbar transparent">
      <div class="container flex justify-between items-center">
        <a href="/" class="logo flex items-center gap-1">
          <img src="/images/FGCI LOGO.png" alt="FGCM-KNUST Logo" width="40" height="40" decoding="async" fetchpriority="low" style="height: 40px; width: auto; object-fit: contain;" />
          <span class="logo-text">${churchInfo.shortName}</span>
        </a>
        
        <nav class="desktop-nav items-center gap-4">
          <a href="/" class="nav-link ${currentPath === '/' ? 'active' : ''}">Home</a>
          <a href="/events" class="nav-link ${currentPath === '/events' ? 'active' : ''}">Events</a>
          <a href="/leaders" class="nav-link ${currentPath === '/leaders' ? 'active' : ''}">Leaders</a>
          <a href="/store" class="nav-link ${currentPath === '/store' ? 'active' : ''}">Store</a>
          <a href="/register" class="btn btn-gold btn-sm">Join Family</a>
        </nav>
        
        <div class="nav-actions flex items-center gap-2">
          <button id="cart-toggle" class="cart-btn position-relative" aria-label="Open cart">
            <i data-lucide="shopping-bag"></i>
            <span id="nav-cart-badge" class="cart-badge">${CartStore.getCount()}</span>
          </button>
          
          <button id="mobile-menu-toggle" class="mobile-toggle" aria-label="Toggle menu">
            <i data-lucide="menu"></i>
          </button>
        </div>
      </div>
      
      <!-- Mobile Dropdown Menu -->
      <div id="mobile-menu" class="mobile-menu-dropdown">
        <nav class="mobile-nav flex flex-col gap-2">
          <a href="/" class="mobile-link ${currentPath === '/' ? 'active-mobile-link' : ''}">Home</a>
          <a href="/events" class="mobile-link ${currentPath === '/events' ? 'active-mobile-link' : ''}">Events</a>
          <a href="/leaders" class="mobile-link ${currentPath === '/leaders' ? 'active-mobile-link' : ''}">Leaders</a>
          <a href="/store" class="mobile-link ${currentPath === '/store' ? 'active-mobile-link' : ''}">Store</a>
          <a href="/register" class="mobile-link-join">Join Family</a>
        </nav>
      </div>
    </header>
  `;

  container.innerHTML = navHTML;
  
  // Re-initialize icons
  if (window.lucide) {
    lucide.createIcons({ root: container });
  }

  // Navbar Scroll Effect (rAF-throttled + passive listener; toggle only on threshold cross)
  const navbar = document.getElementById('main-nav');
  let navTicking = false;
  let navIsSolid = false;
  const updateNavbarScroll = () => {
    const solid = window.scrollY > 50;
    if (solid !== navIsSolid) {
      navIsSolid = solid;
      navbar.classList.toggle('solid', solid);
      navbar.classList.toggle('transparent', !solid);
    }
    navTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!navTicking) {
      navTicking = true;
      requestAnimationFrame(updateNavbarScroll);
    }
  }, { passive: true });

  // Dynamic Active Link Update
  const updateActiveLink = () => {
    const hash = (window.location.pathname + window.location.search);
    const path = hash.split('?')[0] || '/';
    // Desktop links
    const desktopLinks = container.querySelectorAll('.desktop-nav .nav-link');
    desktopLinks.forEach(link => {
      const linkPath = (link.getAttribute('href') || '').split('?')[0] || '/';
      link.classList.toggle('active', linkPath === path);
    });
    // Mobile links
    const mobileLinks = container.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
      const linkPath = (link.getAttribute('href') || '').split('?')[0] || '/';
      link.classList.toggle('active-mobile-link', linkPath === path);
    });
  };

  // Update Navbar Theme based on route (e.g. keeping text white on register page)
  const updateNavbarTheme = () => {
    const hash = (window.location.pathname + window.location.search);
    const path = hash.split('?')[0] || '/';
    if (path === '/register') {
      navbar.classList.add('register-page-nav');
    } else {
      navbar.classList.remove('register-page-nav');
    }
  };

  // Update Cart visibility: only visible on store, product details, and cart pages
  const updateCartVisibility = () => {
    const hash = (window.location.pathname + window.location.search);
    const path = hash.split('?')[0] || '/';
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
      if (path === '/store' || path.startsWith('/product') || path === '/cart') {
        cartToggle.style.display = 'flex';
      } else {
        cartToggle.style.display = 'none';
      }
    }
  };

  const handleHashChange = () => {
    updateActiveLink();
    updateNavbarTheme();
    updateCartVisibility();
  };
  
  window.addEventListener('routechange', handleHashChange);
  window.addEventListener('popstate', handleHashChange);

  // Initialize navbar state
  updateActiveLink();
  updateNavbarTheme();
  updateCartVisibility();

  // Ensure that clicks on nav links are treated as explicit navigation (start from top)
  const desktopLinks = container.querySelectorAll('.desktop-nav .nav-link');
  desktopLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '';
      const base = href.split('?')[0] || '#/';
      // store a marker so router knows this was an explicit nav and should not restore prior scroll
      try { sessionStorage.setItem('skipRestore:' + base, '1'); } catch (err) {}
    });
  });

  const mobileNavLinks = container.querySelectorAll('.mobile-link');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '';
      const base = href.split('?')[0] || '#/';
      try { sessionStorage.setItem('skipRestore:' + base, '1'); } catch (err) {}
    });
  });

  // Mobile Menu Logic
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  const openMenu = () => {
    mobileMenu.classList.add('open');
    document.body.classList.add('no-scroll');
    if (window.gsap) {
      gsap.fromTo(mobileLinks, 
        { opacity: 0, y: -10 }, 
        { opacity: 1, y: 0, stagger: 0.07, duration: 0.25, ease: 'power2.out' }
      );
    }
  };

  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    document.body.classList.remove('no-scroll');
  };

  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
    });
  }

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (mobileMenu && mobileMenu.classList.contains('open') && !mobileMenu.contains(e.target) && e.target !== mobileToggle) {
      closeMenu();
    }
  });

  window.addEventListener('routechange', closeMenu);
  window.addEventListener('popstate', closeMenu);

  // Cart Dispatch Event Listener
  window.addEventListener('cart-updated', (e) => {
    const badge = document.getElementById('nav-cart-badge');
    if (badge) {
      badge.textContent = e.detail.count;
      // Animate badge bump
      if (window.gsap && e.detail.count > 0) {
        gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
      }
    }
  });

  // Cart button:
  //  - desktop / tablet (>= 768px): open the slide-in drawer as a quick preview
  //  - mobile (< 768px): navigate straight to the /cart page (no overlay)
  const cartToggle = document.getElementById('cart-toggle');
  if (cartToggle) {
    cartToggle.addEventListener('click', () => {
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      if (isMobile) {
        window.appNavigate('/cart');
      } else {
        window.dispatchEvent(new CustomEvent('open-cart-drawer'));
      }
    });
  }
}
