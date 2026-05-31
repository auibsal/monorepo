// packages/auth/src/rbac.ts
import 'server-only';
import { createClient } from './server';

export type UserRole = 'admin' | 'editor' | 'member';

/**
 * Strictly verifies the user's session and retrieves their role from the secure JWT payload.
 */
export async function getSessionAndRole() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, role: null as UserRole | null };
  }

  // Supabase stores custom claims in app_metadata. 
  // If no role is found, default to 'author'.
  const role = (user.app_metadata.role as UserRole) || 'member';

  return { user, role };
}

/**
 * A mathematical guard for Server Actions and Route Handlers.
 * Throws an error immediately if the user does not have the required permissions.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const { user, role } = await getSessionAndRole();

  if (!user || !role) {
    throw new Error('UNAUTHORIZED: Valid session required.');
  }

  if (!allowedRoles.includes(role)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(', ')}].`);
  }

  return { user, role };
}
