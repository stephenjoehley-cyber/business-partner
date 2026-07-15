'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';
import { PasswordField } from '@/components/PasswordField';

export default function LoginPage() {
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
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-ink-faint">Sign in to your Business Partner.</p>
      </div>

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

        {error && <p className="text-sm text-signal-attention">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded bg-ink px-4 py-2 font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-ink-faint">
        New here?{' '}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
          Create your Business Partner
        </Link>
      </p>
    </main>
  );
}
