'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (contains the token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'magiclink' && accessToken && refreshToken) {
          // Set the session
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError(sessionError.message || 'Authentication failed.');
            return;
          }

          if (!sessionData?.user) {
            setError('Unable to load user data.');
            return;
          }

          // Check user role
          const { data: roleData, error: roleError } = await supabase
            .from('evt_event_roles')
            .select('role')
            .eq('user_id', sessionData.user.id)
            .maybeSingle();

          if (roleError) {
            console.error('Role error:', roleError);
          }

          // If no role exists, create default user role
          if (!roleData) {
            const { error: upsertError } = await supabase
              .from('evt_event_roles')
              .upsert(
                {
                  user_id: sessionData.user.id,
                  role: 'user',
                },
                { onConflict: 'user_id', ignoreDuplicates: true }
              );

            if (upsertError) {
              console.error('Upsert error:', upsertError);
            }

            router.push('/user');
            return;
          }

          // Redirect based on role
          const normalizedRole =
            typeof roleData.role === 'string' ? roleData.role.trim().toLowerCase() : '';

          if (normalizedRole === 'host') {
            router.push('/host');
          } else {
            router.push('/user');
          }
        } else {
          setError('Invalid authentication link.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h1>Authentication Error</h1>
        <p style={{ color: '#d32f2f' }}>{error}</p>
        <a href="/login" style={{ color: '#007bff', textDecoration: 'underline' }}>
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Authenticating...</h1>
        <p>Please wait while we sign you in.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Loading...</h1>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
