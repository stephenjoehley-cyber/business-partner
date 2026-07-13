import type { Signal } from '@/lib/signals/types';

interface AllClearCardProps {
  message: string;
  generatedAt: Date;
  /** Today's upcoming calendar signals, if any — shown alongside the all-clear message so the owner isn't left with a truly empty screen. Not part of the Cognitive Engine's reasoning; this is the raw, already-known schedule. */
  todaysAgenda: Signal[];
}

/**
 * Executive Honesty's calm floor: no signal was urgent enough to reason
 * about, so Business Partner says so plainly rather than manufacturing
 * something to show. "Nothing urgent" is presented as useful information,
 * not as an empty or broken state.
 */
export function AllClearCard({ message, generatedAt, todaysAgenda }: AllClearCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="mb-4 inline-block h-2 w-2 rounded-full bg-signal-steady" aria-hidden />
        <span className="font-mono text-xs text-ink-faint" title="When this was checked">
          {generatedAt.toLocaleString()}
        </span>
      </div>

      <h2 className="text-lg font-semibold leading-snug">All clear.</h2>
      <p className="mt-2 max-w-md text-ink-faint">{message}</p>

      {todaysAgenda.length > 0 && (
        <div className="mt-6 border-t border-surface-border pt-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Today&apos;s agenda</p>
          <ul className="mt-2 flex flex-col gap-2">
            {todaysAgenda.map((signal) => (
              <li key={signal.id} className="rounded border border-surface-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wide text-brass-deep">{signal.domain}</span>
                  <span className="text-xs text-ink-faint">{signal.occurredAt.toLocaleTimeString()}</span>
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
