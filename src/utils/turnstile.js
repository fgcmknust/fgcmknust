/**
 * Turnstile integration helper.
 *
 * Usage:
 *   const ts = await mountTurnstile(containerEl);
 *   ...
 *   const token = await ts.getToken();   // resolves once user has solved (or already solved)
 *   ts.reset();                          // call after a failed submission
 *
 * If Turnstile is not configured server-side, this becomes a no-op and
 * `getToken()` resolves to `null` so forms continue to work in dev.
 */

let configPromise = null;
let scriptPromise = null;

function fetchConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/config')
      .then(r => r.ok ? r.json() : { turnstileEnabled: false, turnstileSiteKey: null })
      .catch(() => ({ turnstileEnabled: false, turnstileSiteKey: null }));
  }
  return configPromise;
}

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function mountTurnstile(container, { theme = 'auto', size = 'flexible' } = {}) {
  if (!container) return null;
  const cfg = await fetchConfig();
  if (!cfg.turnstileEnabled || !cfg.turnstileSiteKey) {
    // Hide cleanly so there is no empty slot in the form.
    container.style.display = 'none';
    return {
      enabled: false,
      getToken: async () => null,
      reset: () => {}
    };
  }

  // Keep the widget centered and bounded so it sits well inside cards of any width.
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.width = '100%';
  container.style.minHeight = '65px';

  await loadScript();

  let currentToken = null;
  let pendingResolve = null;

  const widgetId = window.turnstile.render(container, {
    sitekey: cfg.turnstileSiteKey,
    theme,
    size,
    callback: (token) => {
      currentToken = token;
      if (pendingResolve) {
        pendingResolve(token);
        pendingResolve = null;
      }
    },
    'error-callback': () => {
      currentToken = null;
    },
    'expired-callback': () => {
      currentToken = null;
    }
  });

  return {
    enabled: true,
    getToken: () => {
      if (currentToken) return Promise.resolve(currentToken);
      return new Promise((resolve) => {
        pendingResolve = resolve;
        // Time-bounded wait so submit doesn't hang forever if the user never solves.
        setTimeout(() => {
          if (pendingResolve === resolve) {
            pendingResolve = null;
            resolve(null);
          }
        }, 60_000);
      });
    },
    reset: () => {
      currentToken = null;
      try { window.turnstile.reset(widgetId); } catch (e) { /* ignore */ }
    }
  };
}
