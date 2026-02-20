import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  if (envUrl.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${envUrl}`;
    }
    return `http://localhost:3000${envUrl}`;
  }

  return envUrl;
}

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_supabase) {
      _supabase = createClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});
