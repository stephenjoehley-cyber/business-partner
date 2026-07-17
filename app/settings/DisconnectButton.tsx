'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Generic disconnect action for any live Signal Provider — widened
 * 17 July 2026 (was hardcoded to Google Calendar's disconnect route) so
 * Gmail can reuse it rather than duplicating this component.
 */
export function DisconnectButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDisconnect() {
    setIsSubmitting(true);
    await fetch(endpoint, { method: 'POST' });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={isSubmitting}
      className="focus-ring inline-block rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
    >
      {isSubmitting ? 'Disconnecting…' : 'Disconnect'}
    </button>
  );
}
