'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Manually runs the Cognitive Engine's Observe → Understand → Prioritise →
 * Recommend cycle for Increment 3. The Executive Orchestrator (Increment 5)
 * replaces this button with a schedule — nothing about the pipeline itself
 * changes when that happens.
 */
export function RecommendationTrigger() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/recommendations/generate', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Could not generate a recommendation.');
      }
      if (!data?.recommendation) {
        setMessage(data?.message ?? 'No signals to reason over yet.');
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not generate a recommendation.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="self-start rounded border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-card disabled:opacity-50 focus-ring"
      >
        {isGenerating ? 'Thinking…' : 'Prepare my Morning Brief'}
      </button>
      {message && <p className="text-sm text-ink-faint">{message}</p>}
    </div>
  );
}
