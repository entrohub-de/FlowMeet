'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getUserRole } from '@/lib/api/role';

type AppRole = 'user' | 'organizer' | 'host' | 'admin';
type AccessArea = 'user' | 'host' | 'admin';

interface RoleRouteGuardProps {
  area: AccessArea;
  children: React.ReactNode;
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
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      routerRef.current.replace('/');
      return;
    }

    let cancelled = false;

    getUserRole(user.id).then((role) => {
      if (cancelled) return;

      const allowed =
        (area === 'admin' && role === 'admin') ||
        (area === 'host' && (role === 'host' || role === 'admin')) ||
        (area === 'user' && (role === 'user' || role === 'organizer' || role === 'host' || role === 'admin'));

      if (!allowed) {
        routerRef.current.replace(getHomeByRole(role));
      } else {
        setIsAuthorized(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [area, user, loading]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
