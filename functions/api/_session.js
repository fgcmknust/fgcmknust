// D1 read-replication helper.
//
// Once read replication is enabled on the database (D1 → Settings → Enable
// Read Replication, or the REST API), env.DB.withSession() routes reads to the
// nearest replica instead of the single primary region. That is what makes
// queries fast for users far from the primary — a reader in London hits a
// London replica instead of crossing the planet on every request.
//
// "first-unconstrained" = read from whichever instance is closest, accepting
// eventual consistency (replication lag is typically <100ms, up to ~2s). That
// is the right trade-off for public content and read-only dashboards.
//
// IMPORTANT: use this ONLY for reads that tolerate slight staleness. Writes,
// read-after-write flows, and anything financial must keep using env.DB
// directly (the primary) so they always see the latest committed data. We also
// deliberately avoid the bookmark/Set-Cookie pattern here because a per-user
// cookie would poison the shared edge cache (see _cache.js).
//
// Safe to deploy before replication is turned on: with no replicas, the
// session simply routes to the primary, so behaviour is unchanged until you
// flip the toggle.
export function readReplica(env) {
  return env.DB.withSession('first-unconstrained');
}
