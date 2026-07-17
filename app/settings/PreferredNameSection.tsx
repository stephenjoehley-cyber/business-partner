'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormField, inputClasses } from '@/components/FormField';
import { normalizePreferredName } from '@/lib/settings/preferredName';

/**
 * Decision Backlog Q9 — lets an existing owner set or change their
 * Preferred Name from Settings, not only at signup. Reads and writes the
 * same Supabase `user_metadata` field `app/(auth)/signup/page.tsx` and
 * `app/morning-brief/page.tsx` already use — no new storage location, no
 * new API route: `supabase.auth.updateUser()` only ever touches the
 * calling user's own session, so this needs no new credential either.
 */
export function PreferredNameSection({ initialPreferredName }: { initialPreferredName: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [value, setValue] = useState(initialPreferredName ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  async function handleSave() {
    setIsSubmitting(true);
    setStatus('idle');

    const { error } = await supabase.auth.updateUser({
      data: { preferredName: normalizePreferredName(value) },
    });

    setIsSubmitting(false);
    setStatus(error ? 'error' : 'saved');
    if (!error) router.refresh();
  }

  return (
    <div>
      <FormField label="How should Business Partner address you?" htmlFor="preferredName">
        <input
          id="preferredName"
          type="text"
          autoComplete="given-name"
          className={inputClasses}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus('idle');
          }}
        />
      </FormField>

      <p className="mt-2 text-sm text-ink-faint">
        Your preferred name is used in your Morning Brief and throughout Business Partner&apos;s
        executive conversations.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>

        {status === 'saved' && <p className="text-sm text-ink-faint">Saved.</p>}
        {status === 'error' && (
          <p className="text-sm text-signal-attention">Something went wrong — please try again.</p>
        )}
      </div>
    </div>
  );
}
