// GET /api/members
// Admin-only: list registered members

import { checkAdminAuth } from './_auth.js';
import { readReplica } from './_session.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = checkAdminAuth(request, env);
  if (!auth.ok) return auth.response;

  // Read-only listing; nearest-replica read is fine for the admin dashboard.
  const DB = readReplica(env);

  const result = await DB.prepare(`
    SELECT id, first_name, middle_name, last_name, email, phone, department, created_at
    FROM members
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  const formattedMembers = (result.results || []).map(member => {
    const parts = [member.first_name, member.middle_name, member.last_name].filter(Boolean);
    return {
      ...member,
      full_name: parts.join(' ')
    };
  });

  return Response.json({ members: formattedMembers, count: formattedMembers.length });
}
