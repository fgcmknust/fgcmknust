import { checkAdminBearer, checkAdminSession } from '../_auth.js';
import { rateLimit, tooManyRequests, getClientIp } from '../_rate_limit.js';
import { verifyTurnstile, turnstileConfigured, captchaFailedResponse } from '../_turnstile.js';

// Endpoints that exist for the login flow. We rate-limit and (when Turnstile is
// configured) CAPTCHA-gate them aggressively, since they are the brute-force
// surface for the admin token.
const LOGIN_FLOW_PATH = '/api/admin/verify';
// Logout intentionally accepts a cookie OR no auth at all (idempotent).
const LOGOUT_PATH = '/api/admin/logout';

export async function onRequest(context) {
  const { request, env, next } = context;

  // Note: no `OPTIONS` short-circuit. Previously we returned next() for
  // OPTIONS, which let attackers issue OPTIONS requests bypassing the rate
  // limiter and burning Worker invocations. The admin handlers don't define
  // onRequestOptions, so OPTIONS now flows through the same rate-limit + auth
  // path as any other method and Pages returns 405 downstream.

  const url = new URL(request.url);
  const isLoginFlow = url.pathname === LOGIN_FLOW_PATH;
  const isLogout = url.pathname === LOGOUT_PATH;
  const ip = getClientIp(request);

  // ---------- Rate limiting ----------
  if (isLoginFlow) {
    // Aggressive throttle on the login-flow endpoint.
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
    // Lighter throttle on admin mutation endpoints to limit a stolen-cookie blast radius.
    const rl = await rateLimit(env.DB, `admin-mut:${ip}`, { limit: 120, windowMs: 60 * 1000 });
    if (!rl.ok) return tooManyRequests(rl);
  }

  // ---------- Auth ----------
  // Login: caller must present the Bearer token directly. On success
  // verify.js will mint a session cookie that all subsequent endpoints
  // accept via checkAdminSession.
  if (isLoginFlow) {
    const auth = checkAdminBearer(request, env);
    if (!auth.ok) return auth.response;
    return next();
  }

  // Logout: idempotent. Whether or not the cookie is valid, we let
  // logout.js run so it can issue the clear-cookie response.
  if (isLogout) {
    return next();
  }

  // Everything else under /api/admin/* must carry a valid session cookie.
  const session = await checkAdminSession(request, env);
  if (!session.ok) return session.response;

  return next();
}
