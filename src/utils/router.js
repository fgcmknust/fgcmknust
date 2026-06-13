/**
 * Simple Hash-based Router
 */
export class Router {
  constructor(routes, onNavigate) {
    this.routes = routes;
    this.onNavigate = onNavigate; // Callback to handle page transitions/loading
    
    // Save scroll position for previous hash when hash changes (used for back/forward)
    window.addEventListener('hashchange', (e) => {
      try {
        const oldHashFull = new URL(e.oldURL).hash || '';
        const oldBase = (oldHashFull.split('?')[0]) || '#/';
        sessionStorage.setItem('scroll:' + oldBase, String(window.scrollY || 0));
      } catch (err) {
        // ignore
      }
    });

    // Listen for hash changes (routing)
    window.addEventListener('hashchange', this.handleRouteChange.bind(this));
    
    // Handle initial load
    window.addEventListener('load', this.handleRouteChange.bind(this));
  }

  getCurrentPath() {
    const hash = window.location.hash.slice(1);
    return hash.split('?')[0] || '/';
  }

  getParams() {
    const hash = window.location.hash.slice(1);
    const searchParams = new URLSearchParams(hash.split('?')[1] || '');
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }

  async handleRouteChange() {
    const path = this.getCurrentPath();
    let matchedRoute = null;
    let routeParams = {};

    // Match route
    for (const route in this.routes) {
      if (route === path) {
        matchedRoute = this.routes[route];
        break;
      }
      
      // Basic dynamic routing (e.g., /product/:id)
      if (route.includes(':')) {
        const routeParts = route.split('/');
        const pathParts = path.split('/');
        
        if (routeParts.length === pathParts.length) {
          let isMatch = true;
          const params = {};
          
          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              params[routeParts[i].substring(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
              isMatch = false;
              break;
            }
          }
          
          if (isMatch) {
            matchedRoute = this.routes[route];
            routeParams = params;
            break;
          }
        }
      }
    }

    if (!matchedRoute && this.routes['*']) {
      matchedRoute = this.routes['*']; // 404 fallback
    }

    if (matchedRoute) {
      const container = document.getElementById('page-content') || document.getElementById('app');
      
      // Call transition hook if provided
      if (this.onNavigate) {
        await this.onNavigate(() => matchedRoute(container, { params: routeParams, query: this.getParams() }));
      } else {
        await matchedRoute(container, { params: routeParams, query: this.getParams() });
      }
      
      // Restore saved scroll for this base hash if available, otherwise scroll to top.
      // If navigation was an explicit nav (menu link), a marker `skipRestore:<baseHash>` will be present.
      const currentHashFull = window.location.hash || '';
      const baseHash = currentHashFull.split('?')[0] || '#/';

      const skipRestore = sessionStorage.getItem('skipRestore:' + baseHash);
      if (skipRestore) {
        try { sessionStorage.removeItem('skipRestore:' + baseHash); } catch (err) {}
        window.scrollTo(0, 0);
      } else {
        const saved = sessionStorage.getItem('scroll:' + baseHash);
        if (saved !== null) {
          window.scrollTo(0, parseInt(saved, 10) || 0);
          sessionStorage.removeItem('scroll:' + baseHash);
        } else {
          window.scrollTo(0, 0);
        }
      }
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}
