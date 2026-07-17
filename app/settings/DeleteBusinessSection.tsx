'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DeleteBusinessSectionProps {
  businessName: string;
}

export function DeleteBusinessSection({ businessName }: DeleteBusinessSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmDelete() {
    setIsSubmitting(true);
    await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: feedback.trim() || undefined }),
    });
    await supabase.auth.signOut();
    router.push('/onboarding?deleted=true');
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="focus-ring inline-block rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-ink"
      >
        Delete this business
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-surface-border p-4">
      <p className="text-sm text-ink">
        This can&apos;t be undone.
        <br />
        Everything Business Partner has learned about <strong>{businessName}</strong> will be
        permanently deleted.
        <br />
        Your login will remain active, so you can return and start a new business here at any
        time.
      </p>

      <p className="mt-4 text-sm text-ink-faint">
        We&apos;ll permanently remove everything Business Partner has learned about your business.
        <br />
        If you&apos;re leaving because something didn&apos;t work as expected, we&apos;d genuinely
        appreciate your feedback before you go.
      </p>

      <label htmlFor="delete-feedback" className="mt-2 block text-sm text-ink-faint">
        Before you go (optional)
      </label>
      <textarea
        id="delete-feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="If there's anything we could have done better, we'd genuinely appreciate your feedback."
        rows={3}
        className="focus-ring mt-1 w-full rounded-md border border-surface-border p-2 text-sm text-ink"
      />

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={handleConfirmDelete}
          disabled={isSubmitting}
          className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {isSubmitting ? 'Deleting…' : 'Yes, delete everything'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isSubmitting}
          className="focus-ring inline-block rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          Keep my business
        </button>
      </div>
    </div>
  );
}
