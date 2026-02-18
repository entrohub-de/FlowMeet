import { supabase } from '@/lib/supabase/client';

export type UserRole = 'user' | 'host' | 'admin';

export interface UserRoleData {
  id: number;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export type HostApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface HostApplication {
  id: string;
  user_id: string;
  status: HostApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
 * Apply to become a host (insert into usr_host_applications)
 */
export async function applyForHost(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('usr_host_applications')
      .insert({ user_id: userId, status: 'pending' });

    if (error) {
      // Unique constraint violation = already applied
      if (error.code === '23505') {
        return { success: false, error: 'already_applied' };
      }
      console.error('Error applying for host:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error applying for host:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get the host application status for a user
 */
export async function getHostApplication(userId: string): Promise<HostApplication | null> {
  const { data, error } = await supabase
    .from('usr_host_applications')
    .select('id, user_id, status, created_at, reviewed_at, reviewed_by')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching host application:', error);
    return null;
  }

  return data as HostApplication | null;
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
