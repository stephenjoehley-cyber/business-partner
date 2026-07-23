'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Generic disconnect action for any live Signal Provider — widened
 * 17 July 2026 (was hardcoded to Google Calendar's disconnect route) so
 * Gmail can reuse it rather than duplicating this component.
 *
 * Found during Sprint 001 authenticated QA, 23 July 2026: this never
 * checked response.ok or caught a thrown error at all — a failed
 * disconnect (network drop, server error) left the button stuck
 * showing "Disconnecting…", disabled, with no way to retry short of a
 * full page reload, and no indication anything had gone wrong.
 */
export function DisconnectButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleDisconnect() {
    setIsSubmitting(true);
    setError(false);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error('Disconnect failed');
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={isSubmitting}
        className="focus-ring inline-block rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
      >
        {isSubmitting ? 'Disconnecting…' : 'Disconnect'}
      </button>
      {error && (
        <p className="text-xs text-signal-attention">
          Something went wrong on my side, not yours. Try again in a moment.
        </p>
      )}
    </div>
  );
}
