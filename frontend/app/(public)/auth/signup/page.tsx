'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { recordConsent } from '@/lib/api/consent';
import { localizeAuthError } from '@/lib/utils/auth-errors';
import { Eye, EyeOff } from 'lucide-react';

function getPasswordStrength(password: string): { level: number; key: string } {
  if (password.length === 0) return { level: 0, key: '' };
  if (password.length < 8) return { level: 1, key: 'passwordTooShort' };
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasLower && hasUpper && hasDigit && hasSpecial) return { level: 4, key: 'passwordStrong' };
  if ((hasLower || hasUpper) && hasUpper && hasDigit) return { level: 3, key: 'passwordMedium' };
  return { level: 2, key: 'passwordWeak' };
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/user');
    }
  }, [authLoading, user, router]);

  const handlePasswordSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch') || '两次密码输入不一致');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(localizeAuthError(signUpError.message, locale));
        return;
      }

      if (authData?.user) {
        await supabase
          .from('usr_role')
          .upsert(
            { user_id: authData.user.id, role: 'user' },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );
        await recordConsent(authData.user.id).catch(() => {});
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? localizeAuthError(err.message, locale) : 'Unable to sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!privacyConsent) return;
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
      setError(localizeAuthError(oauthError.message, locale));
    }
  };

  if (authLoading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Brand glow background */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent/[0.08] blur-[100px]" />

      {/* Language switcher */}
      <button
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="absolute top-4 right-4 px-button h-button text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-button transition-colors cursor-pointer flex items-center justify-center z-10"
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>

      <div className="w-full max-w-md bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/entrohub-full-logo.png"
            alt="FlowMeet"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('auth.createAccountTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.createAccountDesc')}</p>
        </div>

        {success ? (
          <div className="space-y-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-sm text-foreground font-medium">
              {t('auth.checkInboxVerify')}
            </p>
            <Link
              href="/login"
              className="block w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center text-sm"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <>
            {/* Google sign up - primary action */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={!privacyConsent}
              className="w-full h-12 bg-background border border-border rounded-xl font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.continueWithGoogle')}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card/80 px-3 text-muted-foreground">{t('auth.or')}</span>
              </div>
            </div>

            {/* Email + Password form */}
            <form className="space-y-4" onSubmit={handlePasswordSignUp}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  className="w-full h-12 px-4 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className="w-full h-12 px-4 pr-12 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('auth.createPasswordPlaceholder')}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {password.length > 0 && (() => {
                  const strength = getPasswordStrength(password);
                  const colors = ['', 'bg-destructive', 'bg-destructive', 'bg-yellow-500', 'bg-green-500'];
                  const textColors = ['', 'text-destructive', 'text-destructive', 'text-yellow-600', 'text-green-600'];
                  return (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= strength.level ? colors[strength.level] : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${textColors[strength.level]}`}>
                        {t('auth.passwordStrength')}: {t(`auth.${strength.key}`)}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    className="w-full h-12 px-4 pr-12 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  {error}
                </p>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">
                  {t('privacy.consent')}{' '}
                  <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                    {t('privacy.policy.title')}
                  </Link>
                </span>
              </label>

              <button
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading || !privacyConsent}
              >
                {loading ? t('auth.creatingAccount') : t('auth.signUp')}
              </button>
            </form>
          </>
        )}

        {/* Switch to login */}
        <p className="text-sm text-center text-muted-foreground">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
