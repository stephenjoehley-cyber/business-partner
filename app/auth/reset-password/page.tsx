'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';

/**
 * Handles a Supabase password-recovery link. Supabase can send two
 * different link formats depending on configuration: a `?code=` query
 * parameter (PKCE flow, exchanged via exchangeCodeForSession — the same
 * pattern the signup confirmation callback uses), or an older
 * `#access_token=...&refresh_token=...&type=recovery` URL fragment. A
 * fragment is never sent to the server, so it can only be read here,
 * client-side, from window.location.hash after mount. Both are handled so
 * neither link format leaves the owner stuck.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isExchanging, setIsExchanging] = useState(true);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function establishSession() {
      const code = searchParams.get('code');

      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) {
          setExchangeError('This reset link has expired or already been used. Please request a new one.');
        }
        setIsExchanging(false);
        return;
      }

      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) {
          setExchangeError('This reset link has expired or already been used. Please request a new one.');
        }
        setIsExchanging(false);
        return;
      }

      setExchangeError('This reset link is missing or incomplete. Please request a new one.');
      setIsExchanging(false);
    }

    establishSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 1500);
  }

  if (isExchanging) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
        <p className="text-ink-faint">Checking your reset link…</p>
      </main>
    );
  }

  if (exchangeError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
        <h1 className="text-2xl font-semibold">Link no longer valid</h1>
        <p className="text-ink-faint">{exchangeError}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
      </div>

      {success ? (
        <p className="text-ink-faint">Password updated. Taking you to Business Partner…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="New password" htmlFor="password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClasses}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          {error && <p className="text-sm text-signal-attention">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded bg-ink px-4 py-2 font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
          >
            {isSubmitting ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </main>
  );
}
