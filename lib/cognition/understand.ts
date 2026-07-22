import type { BusinessContext } from '@/lib/signals/provider';
import { interpretSignal } from './interpreters/registry';
import { filterSupersededSignals } from './supersession';
import type { Observation, UnderstoodSignal } from './types';

/**
 * Stage 2 — Understand (Asset 013A).
 *
 * "Business Partner connects observations to Business Memory. This creates
 * context." Each Observation is handed to the interpreter registered for
 * its (domain, type) — see interpreters/registry.ts — which is where all
 * domain-specific reasoning lives. This function itself stays domain-blind:
 * it never inspects a payload directly, with one deliberate exception —
 * see below.
 *
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026. Supersession
 * (when the same obligation appears in more than one upload, reason only
 * about the most recent) must run here, before per-signal dispatch —
 * interpretSignal only ever sees one signal at a time, with no visibility
 * across signals, so this genuinely cannot live inside a per-signal
 * interpreter. filterSupersededSignals is a no-op for every domain except
 * finance snapshot signals — every other signal passes through unchanged.
 */
export function understand(observations: Observation[], context: BusinessContext): UnderstoodSignal[] {
  return filterSupersededSignals(observations).map((signal) => {
    const interpreted = interpretSignal(signal, context);
    return {
      insight: { signal, ...interpreted.insight },
      dimensions: interpreted.dimensions,
      reasoning: interpreted.reasoning,
      recommendedAction: interpreted.recommendedAction,
    };
  });
}
