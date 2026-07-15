'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';

/**
 * Handles a Supabase password-recovery link.
 *
 * Important: the Supabase browser client automatically detects and
 * processes a recovery link's `?code=` or `#access_token=...` the moment
 * it's created (detectSessionInUrl defaults to true in every browser).
 * This page used to ALSO call exchangeCodeForSession/setSession itself —
 * that raced the client's own automatic exchange and reliably lost,
 * since the single-use code was already consumed a moment earlier by the
 * client's own initialization. The fix is to not duplicate that work:
 * getSession() waits for the automatic detection to finish and simply
 * reports the outcome, which is all this page needs.
 *
 * useSearchParams() requires this to run inside a Suspense boundary for
 * Next.js to prerender the route at build time — the actual form lives in
 * ResetPasswordForm below, and the default export just wraps it.
 */
function ResetPasswordForm() {
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
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsExchanging(false);
        return;
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const urlErrorDescription =
        searchParams.get('error_description') ?? hashParams.get('error_description');
      const hasCode = Boolean(searchParams.get('code'));
      const hasHashToken = Boolean(hashParams.get('access_token'));

      if (urlErrorDescription) {
        setExchangeError(decodeURIComponent(urlErrorDescription.replace(/\+/g, ' ')));
      } else if (hasCode || hasHashToken) {
        setExchangeError('This reset link has expired or already been used. Please request a new one.');
      } else {
        setExchangeError('This reset link is missing or incomplete. Please request a new one.');
      }
      setIsExchanging(false);
    }

    checkSession();
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
          <p className="text-ink-faint">Checking your reset link…</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
