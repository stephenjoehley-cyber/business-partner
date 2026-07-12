import type { Signal } from '@/lib/signals/types';

interface MorningBriefCardProps {
  executiveSummary: string;
  reasoning: string;
  recommendedAction: string;
  confidence: number;
  generatedAt: Date;
  supportingSignals: Signal[];
}

/**
 * Renders the single, structured executive recommendation the Cognitive
 * Engine produced — never a list. Product Principle 3, "One Screen. One
 * Decision.": this card is the whole decision the owner needs to make
 * right now.
 *
 * The confidence tick-mark is this component's signature element (see
 * globals.css design notes) — used nowhere else in the app, so it stays
 * meaningful when it appears here.
 */
export function MorningBriefCard({
  executiveSummary,
  reasoning,
  recommendedAction,
  confidence,
  generatedAt,
  supportingSignals,
}: MorningBriefCardProps) {
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="mb-4 inline-block h-2 w-2 rounded-full bg-brass" aria-hidden />
        <span className="font-mono text-xs text-ink-faint" title="When this recommendation was generated">
          {generatedAt.toLocaleString()}
        </span>
      </div>

      <h2 className="text-lg font-semibold leading-snug">{executiveSummary}</h2>

      <p className="mt-3 max-w-xl text-ink-faint">{reasoning}</p>

      <div className="mt-6 rounded border border-brass/40 bg-brass/5 px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-wide text-brass-deep">Recommended next action</p>
        <p className="mt-1 text-ink">{recommendedAction}</p>
      </div>

      <div className="mt-6 flex items-center gap-2" title="How confident the Cognitive Engine is in this recommendation">
        <span
          className="inline-block h-3 w-1 rounded-sm bg-brass"
          aria-hidden
          style={{ opacity: 0.3 + 0.7 * confidence }}
        />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
          Confidence: {confidencePercent}%
        </span>
      </div>

      {supportingSignals.length > 0 && (
        <div className="mt-6 border-t border-surface-border pt-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Supporting evidence</p>
          <ul className="mt-2 flex flex-col gap-2">
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
        </div>
      )}
    </div>
  );
}
