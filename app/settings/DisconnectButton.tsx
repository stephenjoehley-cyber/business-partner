'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DisconnectButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDisconnect() {
    setIsSubmitting(true);
    await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' });
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
