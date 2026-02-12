'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type AppRole = 'user' | 'host' | 'admin';
type AccessArea = 'user' | 'host';

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

function getHomeByRole(role: AppRole): '/user' | '/host' {
  return role === 'host' || role === 'admin' ? '/host' : '/user';
}

export default function RoleRouteGuard({ area, children }: RoleRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        if (!cancelled) {
          router.replace('/login');
        }
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('usr_role')
        .select('role')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      if (roleError) {
        if (!cancelled) {
          router.replace('/login');
        }
        return;
      }

      const role = normalizeRole(roleData?.role);
      const allowed =
        (area === 'host' && (role === 'host' || role === 'admin')) ||
        (area === 'user' && role === 'user');

      if (!allowed) {
        if (!cancelled) {
          router.replace(getHomeByRole(role));
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
  }, [area, pathname, router]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
