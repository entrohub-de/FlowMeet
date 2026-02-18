'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { getUserRole } from '@/lib/api/role';
import { Eye, EyeOff } from 'lucide-react';

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'admin') {
    router.push('/admin');
  } else if (normalized === 'host') {
    router.push('/host');
  } else {
    router.push('/user');
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading || !user) return;

    getUserRole(user.id).then((role) => {
      redirectByRole(role, router);
    });
  }, [authLoading, user, router]);

  const handleMagicLinkSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(t('auth.magicLinkError') || '发送链接失败，请稍后再试');
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError(t('auth.magicLinkError') || '发送链接失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(t('auth.invalidCredentials') || '邮箱或密码错误');
        return;
      }

      if (!authData?.user) {
        setError(t('auth.invalidCredentials') || '邮箱或密码错误');
        return;
      }

      // Ensure role exists
      const { data: roleData, error: roleError } = await supabase
        .from('usr_role')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (roleError) {
        setError(t('auth.loginError') || '登录失败，请稍后再试');
        return;
      }

      if (!roleData) {
        await supabase
          .from('usr_role')
          .upsert(
            { user_id: authData.user.id, role: 'user' },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );
        router.push('/user');
        return;
      }

      redirectByRole(roleData.role, router);
    } catch (err) {
      setError(t('auth.loginError') || '登录失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useMagicLink ? handleMagicLinkSignIn : handlePasswordSignIn;

  // Show nothing while checking auth status
  if (authLoading) return null;
  // Already logged in, redirect in progress
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      <button
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="absolute top-4 right-4 px-button h-button text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-button transition-colors cursor-pointer flex items-center justify-center"
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('auth.signIn')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.welcomeBack')}</p>
        </div>

        {magicLinkSent ? (
          <div className="space-y-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground font-medium">{t('auth.checkEmailMagicLink')}</p>
            <p className="text-sm text-muted-foreground">
              {t('auth.clickLinkToSignIn')}
            </p>
            <button
              className="w-full px-button h-button bg-primary text-primary-foreground rounded-button font-medium hover:bg-primary/90 transition-colors"
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
            >
              {t('auth.sendAnotherLink')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setUseMagicLink(false)}
                className={`flex-1 px-button h-button text-sm font-medium transition-colors ${
                  !useMagicLink
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t('auth.password')}
              </button>
              <button
                type="button"
                onClick={() => setUseMagicLink(true)}
                className={`flex-1 px-button h-button text-sm font-medium transition-colors ${
                  useMagicLink
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t('auth.magicLink')}
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={loading}
                />
              </div>

              {!useMagicLink && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      className="w-full px-3 py-2 pr-10 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {error}
                </p>
              )}

              <button
                className="w-full px-button h-button bg-primary text-primary-foreground rounded-button font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? useMagicLink
                    ? t('auth.sendingMagicLink')
                    : t('auth.signingIn')
                  : useMagicLink
                  ? t('auth.sendMagicLink')
                  : t('auth.signIn')}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                const { error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                      prompt: 'select_account',
                    },
                  },
                });
                if (oauthError) {
                  setError(t('auth.loginError') || '登录失败，请稍后再试');
                }
              }}
              className="w-full px-button h-button bg-background border border-border rounded-button font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </>
        )}

        <p className="text-sm text-center text-muted-foreground">
          {t('auth.newToFlowMeet')}{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            {t('auth.createAnAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
