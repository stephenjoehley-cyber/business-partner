import type { NarrativeInput } from './types';

/**
 * The seam every Narrative provider must implement — same pattern as
 * `SignalProvider` (lib/signals/provider.ts) and `SignalInterpreter`
 * (lib/cognition/interpreters/types.ts). Swapping the model or provider
 * behind the Narrative Layer (Executive Intelligence Platform, "Model
 * Abstraction Layer") means writing a new file here, never touching
 * generate.ts or validate.ts.
 *
 * A provider returns the model's raw parsed JSON, unvalidated — validation
 * is centralised in validate.ts so every provider is held to the same
 * contract regardless of which model produced the output.
 */
export interface NarrativeProvider {
  readonly id: string;
  generate(input: NarrativeInput): Promise<unknown>;
}
