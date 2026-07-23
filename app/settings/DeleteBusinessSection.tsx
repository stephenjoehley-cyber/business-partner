'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteBusinessSectionProps {
  businessName: string;
}

export function DeleteBusinessSection({ businessName }: DeleteBusinessSectionProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  // Found during Sprint 001 authenticated QA, 23 July 2026: this never
  // checked response.ok before redirecting to "?deleted=true" — a real
  // server error (not just a thrown network exception) would still
  // have told the owner their business was deleted while the data may
  // still exist. Fixed to only redirect on a confirmed success, and to
  // surface a visible error otherwise rather than fail silently.
  async function handleConfirmDelete() {
    setIsSubmitting(true);
    setError(false);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() || undefined }),
      });
      if (!response.ok) throw new Error('Delete failed');
      // Deliberately no signOut() call here — Option A's entire point
      // (Decision Backlog Q11) is that the owner's login stays active
      // after deleting their business. Signing out would force an
      // unnecessary re-login and contradicts the copy shown just above
      // this button ("Your login will remain active..."). The owner is
      // still authenticated; only the Business row is gone, so onboarding
      // (an authenticated route) renders normally, showing the one-time
      // acknowledgment.
      router.push('/onboarding?deleted=true');
    } catch {
      setError(true);
      setIsSubmitting(false);
    }
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

      <div className="mt-4 flex flex-wrap gap-3">
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
      {error && (
        <p className="mt-3 text-sm text-signal-attention">
          Something went wrong on my side, not yours. Nothing has been deleted — try again in a moment.
        </p>
      )}
    </div>
  );
}
