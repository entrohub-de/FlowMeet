import { supabase } from '@/lib/supabase/client';

export type UserRole = 'user' | 'host' | 'admin';

export interface UserRoleData {
  id: number;
  user_id: string;
  role: UserRole;
  created_at: string;
}

/**
 * Get the role of a user
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('usr_role')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user role:', error);
    return 'user'; // Default to 'user' role if error
  }

  return (data?.role as UserRole) || 'user';
}

/**
 * Upgrade user to host role
 * This allows users to become event hosts
 */
export async function upgradeToHost(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if user already has host role
    const currentRole = await getUserRole(userId);

    if (currentRole === 'host') {
      return {
        success: false,
        error: 'You are already a host'
      };
    }

    if (currentRole === 'admin') {
      return {
        success: false,
        error: 'Admins cannot be downgraded to host role'
      };
    }

    // Update the user's role to host
    const { error } = await supabase
      .from('usr_role')
      .update({ role: 'host' })
      .eq('user_id', userId);

    if (error) {
      console.error('Error upgrading to host:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Error upgrading to host:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if user has permission to access host features
 */
export async function isHost(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'host' || role === 'admin';
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}
