'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);

  const handleMagicLinkSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Unable to send magic link.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Unable to sign up.');
        return;
      }

      if (authData?.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(
            {
              user_id: authData.user.id,
              role: 'user',
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );

        if (roleError) {
          setError(roleError.message || 'Unable to assign user role.');
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => router.push('/login?message=signup_success'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useMagicLink ? handleMagicLinkSignUp : handlePasswordSignUp;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start hosting and joining FlowMeet events.</p>

        {success ? (
          <div className={styles.success}>
            <p>
              {useMagicLink
                ? 'Check your email for the magic link to complete signup!'
                : 'Check your inbox to verify your email.'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.authToggle} style={{ marginBottom: '20px' }}>
              <button
                type="button"
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
                    placeholder="Create a password"
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
                    : 'Creating account...'
                  : useMagicLink
                  ? 'Send magic link'
                  : 'Sign up'}
              </button>
            </form>
          </>
        )}

        <p className={styles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
