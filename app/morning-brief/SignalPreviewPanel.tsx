'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Demonstrates the Signal Provider pipeline end-to-end for Increment 2.
 * This is intentionally a raw preview, not a designed experience — the real
 * Morning Brief (reasoning over these signals) ships in Increment 6.
 */
export function SignalPreviewPanel() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/signals/generate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Could not generate signals.');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate signals.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="self-start rounded border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-card disabled:opacity-50 focus-ring"
      >
        {isGenerating ? 'Checking signals…' : 'Refresh signals'}
      </button>
      {error && <p className="text-sm text-signal-attention">{error}</p>}
    </div>
  );
}
