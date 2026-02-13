'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { isProfileComplete } from '@/lib/api/profile';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

const EXEMPT_PATHS = ['/user/profile/complete'];

export default function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
      setIsComplete(true);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId || cancelled) return;

      const complete = await isProfileComplete(userId);
      if (cancelled) return;

      if (!complete) {
        router.replace('/user/profile/complete');
      } else {
        setIsComplete(true);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!isComplete) return null;

  return <>{children}</>;
}
