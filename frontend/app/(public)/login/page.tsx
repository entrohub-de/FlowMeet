'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/context';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        setError(signInError.message || 'Unable to send magic link.');
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('尝试登录...', { email: email.trim() });

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      console.log('登录响应:', { authData, signInError });

      if (signInError) {
        console.error('登录错误:', signInError);
        setError(`登录失败: ${signInError.message}`);
        return;
      }

      if (!authData?.user) {
        console.error('没有用户数据');
        setError('Unable to load user role.');
        return;
      }

      console.log('查询用户角色...', authData.user.id);

      const { data: roleData, error: roleError } = await supabase
        .from('usr_role')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      console.log('角色查询结果:', { roleData, roleError });

      if (roleError) {
        console.error('角色查询错误:', roleError);
        setError(roleError.message || 'Unable to load user role.');
        return;
      }

      if (!roleData) {
        console.log('用户无角色，创建默认角色...');
        const { error: upsertError } = await supabase
          .from('usr_role')
          .upsert(
            {
              user_id: authData.user.id,
              role: 'user',
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );

        if (upsertError) {
          console.error('创建角色失败:', upsertError);
          setError(upsertError.message || 'Unable to assign user role.');
          return;
        }

        console.log('跳转到 /user');
        router.push('/user');
        return;
      }

      const normalizedRole =
        typeof roleData.role === 'string' ? roleData.role.trim().toLowerCase() : '';

      console.log('用户角色:', normalizedRole);

      if (normalizedRole === 'host') {
        console.log('跳转到 /host');
        router.push('/host');
        return;
      }

      console.log('跳转到 /user (默认)');
      router.push('/user');
    } catch (err) {
      console.error('登录异常:', err);
      const errorMessage = err instanceof Error ? err.message : '登录失败，请检查网络连接';
      setError(`错误: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useMagicLink ? handleMagicLinkSignIn : handlePasswordSignIn;

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
