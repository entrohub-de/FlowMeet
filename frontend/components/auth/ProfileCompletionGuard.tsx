'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [status, setStatus] = useState<'checking' | 'complete' | 'exempt'>('checking');
  const checkedRef = useRef(false);

  useEffect(() => {
    const isExempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p));

    if (isExempt) {
      setStatus('exempt');
      return;
    }

    // If profile was already verified complete, skip re-check
    if (checkedRef.current && status === 'complete') return;

    // Reset to checking when navigating away from exempt path
    setStatus('checking');

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
        checkedRef.current = true;
        setStatus('complete');
      }
    };

    check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (status === 'checking') return null;

  return <>{children}</>;
}
