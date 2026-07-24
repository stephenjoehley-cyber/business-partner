'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';
import { PasswordField } from '@/components/PasswordField';
import { humanizeAuthError } from '@/lib/auth/errors';

/**
 * Extracted from app/(auth)/signup/page.tsx (D1.2) — see LoginForm's
 * doc comment for why.
 *
 * Partner Capability, 23 July 2026 — a referral code (?ref=CODE)
 * follows the exact same mechanism already proven for preferredName:
 * passed through Supabase's own user_metadata at signup, since no
 * Business exists yet to attach it to. Resolved into a real
 * PartnerReferral row later, when the Business is actually created
 * during onboarding (app/api/onboarding/business/route.ts) — this form
 * only ever carries the code along, never validates or creates
 * anything itself.
 */
export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

    const referralCode = searchParams.get('ref')?.trim() || undefined;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { preferredName: preferredName.trim() || undefined, referralCode },
      },
    });

    if (signUpError) {
      setError(humanizeAuthError(signUpError.message));
      setIsSubmitting(false);
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
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

      {error && (
        <p role="alert" className="text-sm text-signal-attention">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring mt-2 rounded bg-brass px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating your account…' : 'Create account'}
      </button>
    </form>
  );
}
