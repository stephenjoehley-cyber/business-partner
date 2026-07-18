'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';
import { PasswordField } from '@/components/PasswordField';
import { humanizeAuthError } from '@/lib/auth/errors';

/**
 * Extracted from app/(auth)/login/page.tsx (D1.2) so the route's page.tsx
 * can be a Server Component and carry metadata — Next.js doesn't allow
 * `export const metadata` in a file with 'use client'. Logic is
 * unchanged; only the error copy now goes through humanizeAuthError
 * rather than Supabase's raw message, and the outer <main>/heading
 * markup moved to AuthShell.
 */
export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(humanizeAuthError(signInError.message));
      setIsSubmitting(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Email" htmlFor="email">
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className={inputClasses}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <PasswordField
        label="Password"
        htmlFor="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />

      <Link href="/forgot-password" className="-mt-2 self-start text-sm text-ink-faint underline underline-offset-2">
        Forgot password?
      </Link>

      {error && (
        <p role="alert" className="text-sm text-signal-attention">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring mt-2 rounded bg-ink px-4 py-2 font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
