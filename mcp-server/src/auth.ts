import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

export interface AuthSession {
  userId: string;
  email: string;
  role: 'host' | 'admin' | 'participant';
  activeView: 'host' | 'participant';
}

let currentSession: AuthSession | null = null;
let supabaseAuth: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient {
  if (supabaseAuth) return supabaseAuth;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Login requires SUPABASE_ANON_KEY in .env'
    );
  }

  supabaseAuth = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAuth;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const client = getAuthClient();

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed: ${error.message}`);

  const userId = data.user.id;
  const role = await fetchUserRole(userId);

  currentSession = {
    userId,
    email,
    role,
    activeView: role === 'participant' ? 'participant' : 'host',
  };

  return currentSession;
}

export function logout(): void {
  currentSession = null;
}

export function getSession(): AuthSession | null {
  return currentSession;
}

export function resolveUserId(explicitId?: string): string {
  if (explicitId) return explicitId;
  if (currentSession) return currentSession.userId;
  throw new Error('Not logged in and no userId provided. Use the login tool first or pass userId explicitly.');
}

export function requireAuth(): void {
  if (!currentSession) {
    throw new Error('Not logged in. Use the login tool first.');
  }
}

export function requireHostAccess(): void {
  if (!currentSession) {
    throw new Error('Not logged in. Use the login tool first.');
  }
  if (currentSession.activeView !== 'host') {
    throw new Error('Access denied: host tools require host view. Use switch_view to switch to host mode.');
  }
  if (currentSession.role !== 'host' && currentSession.role !== 'admin') {
    throw new Error('Access denied: your account does not have host privileges.');
  }
}

async function fetchUserRole(userId: string): Promise<AuthSession['role']> {
  const { data, error } = await supabase
    .from('usr_role')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user role:', error.message);
    return 'participant';
  }

  const role = data?.role;
  if (role === 'host' || role === 'admin') return role;
  return 'participant';
}
