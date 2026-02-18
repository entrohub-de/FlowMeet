import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  // Prefer the dedicated server-side URL
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // NEXT_PUBLIC_SUPABASE_URL may be a relative proxy path (e.g. "/supabase-proxy").
  // The Supabase client requires an absolute URL, so fall back to localhost.
  if (url.startsWith('/')) {
    return `http://127.0.0.1:54321`;
  }

  return url;
}

const supabaseUrl = getSupabaseUrl();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
