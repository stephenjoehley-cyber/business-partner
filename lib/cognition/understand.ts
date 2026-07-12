import type { BusinessContext } from '@/lib/signals/provider';
import { interpretSignal } from './interpreters/registry';
import type { Observation, UnderstoodSignal } from './types';

/**
 * Stage 2 — Understand (Asset 013A).
 *
 * "Business Partner connects observations to Business Memory. This creates
 * context." Each Observation is handed to the interpreter registered for
 * its (domain, type) — see interpreters/registry.ts — which is where all
 * domain-specific reasoning lives. This function itself stays domain-blind:
 * it never inspects a payload directly.
 */
export function understand(observations: Observation[], context: BusinessContext): UnderstoodSignal[] {
  return observations.map((signal) => {
    const interpreted = interpretSignal(signal, context);
    return {
      insight: { signal, ...interpreted.insight },
      dimensions: interpreted.dimensions,
      reasoning: interpreted.reasoning,
      recommendedAction: interpreted.recommendedAction,
    };
  });
}
