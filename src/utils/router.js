/**
 * History API Router (clean URLs — no hash)
 * Intercepts clicks on internal <a href="/..."> links and uses pushState.
 * Listens to popstate for back/forward.
 */
export class Router {
  constructor(routes, onNavigate) {
    this.routes = routes;
    this.onNavigate = onNavigate;

    // Save scroll position on every internal navigation BEFORE the URL changes
    this._saveScrollForCurrent = () => {
      try {
        const base = window.location.pathname || '/';
        sessionStorage.setItem('scroll:' + base, String(window.scrollY || 0));
      } catch (err) { /* ignore */ }
    };

    // Backwards-compat: if user lands on /#/something (old bookmark), redirect to /something
    if (window.location.hash.startsWith('#/')) {
      const target = window.location.hash.slice(1); // "/events" or "/events?x=y"
      window.history.replaceState({}, '', target);
    }

    // Listen to back/forward
    window.addEventListener('popstate', () => this.handleRouteChange());

    // Intercept clicks on internal links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href') || '';

      // Skip if the link is not internal (mailto:, https://, etc.)
      if (!href || href.startsWith('http://') || href.startsWith('https://') ||
          href.startsWith('mailto:') || href.startsWith('tel:') ||
          link.getAttribute('target') === '_blank' ||
          link.hasAttribute('download')) {
        return;
      }
      // Skip modifier-clicks (open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      // Convert legacy "#/path" hrefs to "/path"
      let path = href;
      if (path.startsWith('#/')) path = path.slice(1);
      if (!path.startsWith('/')) return; // only handle root-relative paths

      e.preventDefault();
      this._saveScrollForCurrent();
      window.history.pushState({}, '', path);
      this.handleRouteChange();
    });

    // Handle initial load
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => this.handleRouteChange());
    } else {
      this.handleRouteChange();
    }

    // Expose a global navigate helper for any module that needs to navigate programmatically
    window.appNavigate = (path) => {
      this._saveScrollForCurrent();
      window.history.pushState({}, '', path);
      this.handleRouteChange();
    };
  }

  _emitRouteChange() {
    window.dispatchEvent(new CustomEvent('routechange', {
      detail: { path: this.getCurrentPath(), query: this.getParams() }
    }));
  }

  getCurrentPath() {
    return window.location.pathname || '/';
  }

  getParams() {
    const searchParams = new URLSearchParams(window.location.search || '');
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

    for (const route in this.routes) {
      if (route === path) {
        matchedRoute = this.routes[route];
        break;
      }
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
      matchedRoute = this.routes['*'];
    }

    if (matchedRoute) {
      const container = document.getElementById('page-content') || document.getElementById('app');

      if (this.onNavigate) {
        await this.onNavigate(() => matchedRoute(container, { params: routeParams, query: this.getParams() }));
      } else {
        await matchedRoute(container, { params: routeParams, query: this.getParams() });
      }

      // Notify components (navbar, etc.) that the route changed
      this._emitRouteChange();

      // Scroll restoration: respect explicit "start fresh" markers, otherwise restore saved scroll
      const base = window.location.pathname || '/';
      const skipRestore = sessionStorage.getItem('skipRestore:' + base);
      if (skipRestore) {
        try { sessionStorage.removeItem('skipRestore:' + base); } catch (err) {}
        window.scrollTo(0, 0);
      } else {
        const saved = sessionStorage.getItem('scroll:' + base);
        if (saved !== null) {
          window.scrollTo(0, parseInt(saved, 10) || 0);
          sessionStorage.removeItem('scroll:' + base);
        } else {
          window.scrollTo(0, 0);
        }
      }
    }
  }

  navigate(path) {
    if (window.appNavigate) {
      window.appNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      this.handleRouteChange();
    }
  }
}
