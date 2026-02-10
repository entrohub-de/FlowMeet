'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to signup page
    router.replace('/user/signup');
  }, [router]);

  return null;
}
