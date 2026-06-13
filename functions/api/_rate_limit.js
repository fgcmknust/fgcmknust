// D1-backed fixed-window rate limiter. Use one per action so different
// endpoints don't share counters.
//
// Usage:
//   const rl = await rateLimit(env.DB, `register:${getClientIp(request)}`, { limit: 5, windowMs: 60_000 });
//   if (!rl.ok) return tooManyRequests(rl);

export function getClientIp(request) {
  // Cloudflare always sets CF-Connecting-IP; fall back to the X-Forwarded-For
  // left-most value only as a defensive default.
  return (
    request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown'
  );
}

export async function rateLimit(DB, key, { limit, windowMs }) {
  if (!DB || !key || !limit || !windowMs) {
    return { ok: true, remaining: limit, skipped: true };
  }

  const now = Date.now();
  let row;
  try {
    row = await DB.prepare('SELECT count, window_start FROM rate_limits WHERE bucket = ?').bind(key).first();
  } catch (e) {
    // If the table is missing or DB is unavailable, fail open rather than blocking the user.
    console.warn('rate_limits read failed; failing open', e);
    return { ok: true, remaining: limit, skipped: true };
  }

  if (!row || (now - Number(row.window_start)) >= windowMs) {
    try {
      await DB.prepare(
        `INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, ?)
         ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start`
      ).bind(key, now).run();
    } catch (e) {
      console.warn('rate_limits write failed; failing open', e);
      return { ok: true, remaining: limit - 1, skipped: true };
    }
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (Number(row.count) >= limit) {
    const retryAfter = Math.max(1, Math.ceil((Number(row.window_start) + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  try {
    await DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ?').bind(key).run();
  } catch (e) {
    console.warn('rate_limits increment failed; failing open', e);
  }
  return { ok: true, remaining: limit - Number(row.count) - 1, resetMs: (Number(row.window_start) + windowMs) - now };
}

export function tooManyRequests(rl) {
  const retryAfter = rl && rl.retryAfter ? rl.retryAfter : 60;
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again shortly.', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      }
    }
  );
}
