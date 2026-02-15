'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type AppRole = 'user' | 'host' | 'admin';
type AccessArea = 'user' | 'host' | 'admin';

interface RoleRouteGuardProps {
  area: AccessArea;
  children: React.ReactNode;
}

function normalizeRole(rawRole: string | null | undefined): AppRole {
  const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : '';
  if (role === 'host') return 'host';
  if (role === 'admin') return 'admin';
  return 'user';
}

function getHomeByRole(role: AppRole): string {
  if (role === 'admin') return '/admin/hosts';
  if (role === 'host') return '/host';
  return '/user';
}

export default function RoleRouteGuard({ area, children }: RoleRouteGuardProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        if (!cancelled) {
          routerRef.current.replace('/login');
        }
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('usr_role')
        .select('role')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      if (roleError || !roleData) {
        // 无角色数据时重定向到登录页，不默认当 user 处理
        if (!cancelled) {
          routerRef.current.replace('/login');
        }
        return;
      }

      const role = normalizeRole(roleData.role);
      const allowed =
        (area === 'admin' && role === 'admin') ||
        (area === 'host' && (role === 'host' || role === 'admin')) ||
        (area === 'user' && role === 'user');

      if (!allowed) {
        if (!cancelled) {
          routerRef.current.replace(getHomeByRole(role));
        }
        return;
      }

      if (!cancelled) {
        setIsAuthorized(true);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [area]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
