import type { CalendarSignalPayload, Signal } from '@/lib/signals/types';
import { asOfPhrase } from '@/lib/ui/time';

interface AllClearCardProps {
  message: string;
  generatedAt: Date;
  /** Today's upcoming calendar signals, if any — shown alongside the all-clear message so the owner isn't left with a truly empty screen. Not part of the Cognitive Engine's reasoning; this is the raw, already-known schedule. */
  todaysAgenda: Signal[];
}

/** A meeting's own scheduled time is useful, real information for an owner planning their day — unlike a "generated at" audit timestamp, this isn't the kind of machine precision Executive Time (Principle 5) warns against. Formatted without seconds, which is. */
function meetingTime(occurredAt: Date): string {
  return occurredAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Executive Honesty's calm floor: no signal was urgent enough to reason
 * about, so Business Partner says so plainly rather than manufacturing
 * something to show. "Nothing urgent" is presented as useful information,
 * not as an empty or broken state.
 *
 * Asset 024 — Done & Due, 23 July 2026: the empty-state copy shown here
 * is the spec's own exact mandated wording, not the Cognitive Engine's
 * `message` field (still "No signals currently require executive
 * attention.", recommend.ts, untouched — that string may be consumed
 * elsewhere, e.g. logging). This is a deliberate presentation-layer
 * override, not a decision-engine change — `message` is accepted as a
 * prop but no longer displayed verbatim, exactly the same restraint as
 * the rest of this package.
 */
export function AllClearCard({ generatedAt, todaysAgenda }: AllClearCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="mb-4 inline-block h-2 w-2 rounded-full bg-signal-steady" aria-hidden />
        <span className="font-mono text-xs text-ink-faint" title={generatedAt.toLocaleString()}>
          {asOfPhrase(generatedAt)}
        </span>
      </div>

      <h2 className="text-lg font-semibold leading-snug">Nothing today requires your personal attention.</h2>

      <p className="mt-2 max-w-md text-ink-faint">Enjoy the space to think ahead.</p>

      {todaysAgenda.length > 0 && (
        <div className="mt-6 border-t border-surface-border pt-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Today&apos;s agenda</p>
          <ul className="mt-2 flex flex-col gap-2">
            {todaysAgenda.map((signal) => {
              const payload = signal.payload as CalendarSignalPayload;
              return (
                <li key={signal.id} className="rounded border border-surface-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink">{payload.title}</span>
                    <span className="text-xs text-ink-faint">{meetingTime(signal.occurredAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
