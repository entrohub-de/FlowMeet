import { createClient } from '@supabase/supabase-js';

// 动态获取 Supabase URL
// 如果是相对路径，会自动补全为完整 URL
function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // 如果是相对路径（以 / 开头）
  if (envUrl.startsWith('/')) {
    // 在浏览器环境中，使用当前域名
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${envUrl}`;
    }
    // 在服务端（SSR/SSG），使用 localhost
    return `http://localhost:3000${envUrl}`;
  }

  // 否则直接使用配置的 URL
  return envUrl;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
