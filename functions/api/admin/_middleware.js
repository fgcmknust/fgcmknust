import { checkAdminAuth } from '../_auth.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';
import { verifyTurnstile, turnstileConfigured, captchaFailedResponse } from '../_turnstile.js';

// Endpoints that exist for the login flow. We rate-limit and (when Turnstile is
// configured) CAPTCHA-gate them aggressively, since they are the brute-force
// surface for the admin token.
const LOGIN_FLOW_PATH = '/api/admin/verify';

export async function onRequest(context) {
  const { request, env, next } = context;

  if (request.method === 'OPTIONS') {
    return next();
  }

  const url = new URL(request.url);
  const isLoginFlow = url.pathname === LOGIN_FLOW_PATH;
  const ip = getClientIp(request);

  // Aggressive throttle on the login-flow endpoint.
  if (isLoginFlow) {
    const rl = await rateLimit(env.DB, `admin-login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) return tooManyRequests(rl);

    // Optional Turnstile gate on login. Read token from header so it works on
    // a GET. We only enforce when Turnstile is configured.
    if (turnstileConfigured(env)) {
      const token = request.headers.get('X-Captcha-Token');
      const captcha = await verifyTurnstile(token, env, request);
      if (!captcha.ok) return captchaFailedResponse(captcha.error);
    }
  } else {
    // Lighter throttle on admin mutation endpoints to limit a stolen-token blast radius.
    const rl = await rateLimit(env.DB, `admin-mut:${ip}`, { limit: 120, windowMs: 60 * 1000 });
    if (!rl.ok) return tooManyRequests(rl);
  }

  const auth = checkAdminAuth(request, env);
  if (!auth.ok) return auth.response;

  return next();
}
