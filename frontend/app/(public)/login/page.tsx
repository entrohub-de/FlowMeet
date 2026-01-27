'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

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
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (roleError) {
        setError(roleError.message || 'Unable to load user role.');
        return;
      }

      if (!roleData) {
        const { error: upsertError } = await supabase
          .from('user_roles')
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

        router.push('/app');
        return;
      }

      const normalizedRole =
        typeof roleData.role === 'string' ? roleData.role.trim().toLowerCase() : '';

      if (normalizedRole === 'host') {
        router.push('/host');
        return;
      }

      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useMagicLink ? handleMagicLinkSignIn : handlePasswordSignIn;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Welcome back to FlowMeet.</p>

        {magicLinkSent ? (
          <div className={styles.success}>
            <p>Check your email for the magic link!</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Click the link in the email to sign in.
            </p>
            <button
              className={styles.button}
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              style={{ marginTop: '16px' }}
            >
              Send another link
            </button>
          </div>
        ) : (
          <>
            <div className={styles.authToggle} style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={!useMagicLink ? styles.toggleActive : styles.toggleInactive}
                onClick={() => setUseMagicLink(false)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: !useMagicLink ? '#007bff' : '#e0e0e0',
                  color: !useMagicLink ? 'white' : '#666',
                  borderRadius: '4px 0 0 4px',
                  cursor: 'pointer',
                }}
              >
                Password
              </button>
              <button
                type="button"
                className={useMagicLink ? styles.toggleActive : styles.toggleInactive}
                onClick={() => setUseMagicLink(true)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: useMagicLink ? '#007bff' : '#e0e0e0',
                  color: useMagicLink ? 'white' : '#666',
                  borderRadius: '0 4px 4px 0',
                  cursor: 'pointer',
                }}
              >
                Magic Link
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className={styles.input}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
              />

              {!useMagicLink && (
                <>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    required
                    disabled={loading}
                  />
                </>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.button} type="submit" disabled={loading}>
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

        <p className={styles.footer}>
          New to FlowMeet? <Link href="/auth/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
