import { supabase } from '@/lib/supabase/client';

/**
 * Get the current authenticated user's ID.
 * Throws if not authenticated.
 */
export async function requireUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('请先登录');
  }
  return session.user.id;
}

/**
 * Get the current user's ID, or null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
