import type { Signal } from '@/lib/signals/types';

interface MorningBriefCardProps {
  /** confident_recommendation renders a directive with a recommended action; low_confidence_insight renders the same shape informationally, with no action box. */
  tier: 'confident_recommendation' | 'low_confidence_insight';
  /** Narrative-layer text if available, otherwise the Cognitive Engine's own deterministic strings (see app/morning-brief/page.tsx — the Narrative Layer's fallback is invisible at this layer too). */
  headline: string;
  whyItMatters: string;
  actionText?: string;
  confidence: number;
  generatedAt: Date;
  /** The complete traceable signal list this brief was reasoned from. Always the deterministic ground truth — never touched by the Narrative Layer. */
  supportingSignals: Signal[];
}

function signalLabel(signal: Signal): string {
  return `${signal.domain} · ${signal.type.replaceAll('_', ' ')}`;
}

/**
 * Renders the Cognitive Engine's single output for a given day — never a
 * list. Product Principle 3, "One Screen. One Decision.": this card is the
 * whole decision (or honest non-decision) the owner needs right now.
 *
 * Evidence is progressively disclosed (Constitution's "Clarity first.
 * Transparency on demand."): one or two supporting observations are named
 * inline; the full traceable signal list is one click away, never forced
 * on the owner by default.
 */
export function MorningBriefCard({
  tier,
  headline,
  whyItMatters,
  actionText,
  confidence,
  generatedAt,
  supportingSignals,
}: MorningBriefCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const isConfident = tier === 'confident_recommendation';
  const relatedSignals = supportingSignals.slice(1); // the first is the subject of the headline itself

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-8">
      <div className="flex items-start justify-between gap-4">
        <span
          className="mb-4 inline-block h-2 w-2 rounded-full bg-brass"
          aria-hidden
          style={{ opacity: isConfident ? 1 : 0.4 }}
        />
        <span className="font-mono text-xs text-ink-faint" title="When this was generated">
          {generatedAt.toLocaleString()}
        </span>
      </div>

      {!isConfident && (
        <p className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
          No high-confidence recommendation today — here&apos;s the most relevant observation
        </p>
      )}

      <h2 className="text-lg font-semibold leading-snug">{headline}</h2>

      <p className="mt-3 max-w-xl text-ink-faint">{whyItMatters}</p>

      {isConfident && actionText && (
        <div className="mt-6 rounded border border-brass/40 bg-brass/5 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide text-brass-deep">Recommended next action</p>
          <p className="mt-1 text-ink">{actionText}</p>
        </div>
      )}

      <div
        className="mt-6 flex items-center gap-2"
        title={isConfident ? 'How confident the Cognitive Engine is in this recommendation' : 'Below the threshold for a direct recommendation'}
      >
        <span
          className="inline-block h-3 w-1 rounded-sm bg-brass"
          aria-hidden
          style={{ opacity: 0.3 + 0.7 * confidence }}
        />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
          Confidence: {confidencePercent}%
        </span>
      </div>

      {relatedSignals.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {relatedSignals.slice(0, 2).map((signal) => (
            <li key={signal.id} className="text-sm text-ink-faint">
              Also relevant: {signalLabel(signal)} ({signal.occurredAt.toLocaleDateString()})
            </li>
          ))}
        </ul>
      )}

      {supportingSignals.length > 0 && (
        <details className="mt-6 border-t border-surface-border pt-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-ink-faint focus-ring">
            View supporting evidence ({supportingSignals.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {supportingSignals.map((signal) => (
              <li key={signal.id} className="rounded border border-surface-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wide text-brass-deep">{signal.domain}</span>
                  <span className="text-xs text-ink-faint">{signal.occurredAt.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-ink">{signal.type.replaceAll('_', ' ')}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
