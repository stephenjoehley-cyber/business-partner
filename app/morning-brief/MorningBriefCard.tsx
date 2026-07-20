import { confidenceRegisterFor, confidenceRegisterLabel } from '@/lib/narrative/confidenceRegister';
import { describeSignalPlainly } from '@/lib/signals/describe';
import type { Signal } from '@/lib/signals/types';
import type { Person } from '@prisma/client';
import { asOfPhrase } from '@/lib/ui/time';
import { relativeDatePhrase } from '@/lib/shared/time';

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
  /** Found live, 19 July 2026 — without this, describeSignalPlainly (used for the "Also tracking" section and the evidence list below) could describe the exact same meeting differently from the winning recommendation's own headline, which does look the matched Person up. Defaults to none. */
  people?: Person[];
  /** Executive Presence Increment 1 — Demonstrating Understanding (per the Executive Presence Audit, 19 July 2026) — an already-finished, deterministic sentence from the Cognitive Engine (see lib/cognition/continuity.ts). Rendered directly, never passed through the Narrative Layer — there's nothing here for it to translate. Undefined whenever nothing has changed since the previous brief. */
  continuityNote?: string;
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
 *
 * Executive Presence Specification compliance, made explicit here because
 * this component was where every named violation in the Increment 4
 * Founder Experience Review actually lived: no raw signal domain/type
 * (Principle 3), no confidence percentage in the primary view (Principle
 * 4 — the register phrase is the headline; the number, if wanted at all,
 * is a hover disclosure), and no machine-precision timestamp (Principle 5
 * — `asOfPhrase` in the primary view, full precision only in a `title`
 * attribute for an owner who wants it).
 */
export function MorningBriefCard({
  tier,
  headline,
  whyItMatters,
  actionText,
  confidence,
  generatedAt,
  supportingSignals,
  people = [],
  continuityNote,
}: MorningBriefCardProps) {
  const isConfident = tier === 'confident_recommendation';
  const register = confidenceRegisterFor(tier, confidence);
  const registerLabel = confidenceRegisterLabel(register);
  const confidencePercent = Math.round(confidence * 100);
  const relatedSignals = supportingSignals.slice(1); // the first is the subject of the headline itself

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-8">
      <div className="flex items-start justify-between gap-4">
        <span
          className="mb-4 inline-block h-2 w-2 rounded-full bg-brass"
          aria-hidden
          style={{ opacity: isConfident ? 1 : 0.4 }}
        />
        <span className="font-mono text-xs text-ink-faint" title={generatedAt.toLocaleString()}>
          {asOfPhrase(generatedAt)}
        </span>
      </div>

      {!isConfident && (
        <p className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
          I don&apos;t have enough to be confident about this yet — here&apos;s what&apos;s most worth noticing.
        </p>
      )}

      <h2 className="text-lg font-semibold leading-snug">{headline}</h2>

      <p className="mt-3 max-w-xl text-ink-faint">{whyItMatters}</p>

      {continuityNote && (
        <p className="mt-3 max-w-xl text-sm text-ink-faint italic">{continuityNote}</p>
      )}

      {isConfident && actionText && (
        <div className="mt-6 rounded border border-brass/40 bg-brass/5 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide text-brass-deep">Recommended next action</p>
          <p className="mt-1 text-ink">{actionText}</p>
        </div>
      )}

      <div
        className="mt-6 flex items-center gap-2"
        title={`${confidencePercent}% — full supporting evidence is below`}
      >
        <span
          className="inline-block h-3 w-1 rounded-sm bg-brass"
          aria-hidden
          style={{ opacity: 0.3 + 0.7 * confidence }}
        />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">{registerLabel}</span>
      </div>

      {relatedSignals.length > 0 && (
        <div className="mt-6 border-t border-surface-border pt-4">
          {/*
            Found live, 19 July 2026: the confidence badge above
            (registerLabel — e.g. "Worth acting on today") describes only
            the winning recommendation's own confidence. It previously sat
            directly above this list with no separation, creating a real,
            plausible misreading that it endorsed these other signals too
            — even ones the Cognitive Engine has already correctly decayed
            toward zero urgency. This heading and the border above it make
            clear these are other things Business Partner is tracking, not
            a second batch of "worth acting on" items.
          */}
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Also tracking</p>
          <ul className="mt-2 flex flex-col gap-1">
            {relatedSignals.slice(0, 2).map((signal) => (
              <li key={signal.id} className="text-sm text-ink-faint">
                {describeSignalPlainly(signal, generatedAt, people)} ({relativeDatePhrase(generatedAt, signal.occurredAt)})
              </li>
            ))}
          </ul>
        </div>
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
                  <span className="text-xs text-ink-faint">{relativeDatePhrase(generatedAt, signal.occurredAt)}</span>
                </div>
                <p className="mt-1 text-ink">{describeSignalPlainly(signal, generatedAt, people)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

