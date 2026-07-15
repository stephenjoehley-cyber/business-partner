'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';
import { PasswordField } from '@/components/PasswordField';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { preferredName: preferredName.trim() || undefined },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Meet your new AI Business Partner</h1>
        <p className="mt-1 text-ink-faint">Tell me about your business and I&apos;ll start working immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="What would you like Business Partner to call you?" htmlFor="preferredName">
          <input
            id="preferredName"
            type="text"
            autoComplete="given-name"
            className={inputClasses}
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
          />
        </FormField>

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
          autoComplete="new-password"
          required
          minLength={8}
        />

        {error && <p className="text-sm text-signal-attention">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded bg-brass px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
        >
          {isSubmitting ? 'Creating your account…' : "Let's get started"}
        </button>
      </form>

      <p className="text-sm text-ink-faint">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </main>
  );
}
