'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/context';

async function ensureRoleAndRedirect(
  userId: string,
  router: ReturnType<typeof useRouter>
) {
  const { data: roleData, error: roleError } = await supabase
    .from('usr_role')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    console.error('Role error:', roleError);
  }

  if (!roleData) {
    await supabase
      .from('usr_role')
      .upsert(
        { user_id: userId, role: 'user' },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
    router.push('/user');
    return;
  }

  const normalizedRole =
    typeof roleData.role === 'string' ? roleData.role.trim().toLowerCase() : '';

  if (normalizedRole === 'admin') {
    router.push('/admin/test/simulator');
  } else if (normalizedRole === 'host') {
    router.push('/host');
  } else {
    router.push('/user');
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // OAuth providers (Google etc.) use query param `code`
        const code = searchParams.get('code');
        if (code) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            setError(sessionError.message || t('auth.callbackError'));
            return;
          }

          if (!sessionData?.user) {
            setError(t('auth.callbackNoUser'));
            return;
          }

          await ensureRoleAndRedirect(sessionData.user.id, router);
          return;
        }

        // Implicit flow: magic link, email verification, or OAuth (Google etc.)
        // OAuth implicit flow returns tokens in hash WITHOUT a type param
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError(sessionError.message || t('auth.callbackError'));
            return;
          }

          if (!sessionData?.user) {
            setError(t('auth.callbackNoUser'));
            return;
          }

          await ensureRoleAndRedirect(sessionData.user.id, router);
        } else {
          setError(t('auth.callbackInvalidLink'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.callbackError'));
      }
    };

    handleAuthCallback();
  }, [router, searchParams, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-4 bg-background">
        <h1 className="text-xl font-semibold text-foreground">{t('auth.callbackErrorTitle')}</h1>
        <p className="text-sm text-destructive">{error}</p>
        <a href="/login" className="text-primary underline text-sm">
          {t('auth.backToLogin')}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{t('auth.authenticating')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.pleaseWait')}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Loading...</h1>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
