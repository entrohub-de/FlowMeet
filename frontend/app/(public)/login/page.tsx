'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message || 'Unable to sign in.');
        return;
      }

      if (!authData?.user) {
        setError('Unable to load user role.');
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('evt_event_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (roleError) {
        setError(roleError.message || 'Unable to load user role.');
        return;
      }

      if (!roleData) {
        const { error: upsertError } = await supabase
          .from('evt_event_roles')
          .upsert(
            {
              user_id: authData.user.id,
              role: 'user',
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );

        if (upsertError) {
          setError(upsertError.message || 'Unable to assign user role.');
          return;
        }

        router.push('/user');
        return;
      }

      const normalizedRole =
        typeof roleData.role === 'string' ? roleData.role.trim().toLowerCase() : '';

      if (normalizedRole === 'host') {
        router.push('/host');
        return;
      }

      router.push('/user');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useMagicLink ? handleMagicLinkSignIn : handlePasswordSignIn;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">Welcome back to FlowMeet.</p>
        </div>

        {magicLinkSent ? (
          <div className="space-y-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground font-medium">Check your email for the magic link!</p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to sign in.
            </p>
            <button
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
            >
              Send another link
            </button>
          </div>
        ) : (
          <>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setUseMagicLink(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  !useMagicLink
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setUseMagicLink(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  useMagicLink
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                Magic Link
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {!useMagicLink && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {error}
                </p>
              )}

              <button
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? useMagicLink
                    ? 'Sending magic link...'
                    : 'Signing in...'
                  : useMagicLink
                  ? 'Send magic link'
                  : 'Sign in'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-center text-muted-foreground">
          New to FlowMeet?{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
