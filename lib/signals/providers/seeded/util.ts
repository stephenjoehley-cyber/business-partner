/**
 * Deterministic helpers for seeded providers.
 *
 * Seeded signals are not random filler — they should read as specific to
 * the business (Blueprint §6). To do that without a real data source, we
 * derive a stable pseudo-random sequence from the business ID and the
 * generation date, so:
 *   - the same business gets a *consistent* seeded "personality"
 *   - re-running the pipeline on the same day is idempotent (paired with
 *     externalRef uniqueness — see DECISIONS.md)
 *   - a new day produces a plausibly different, but still consistent, set
 */

function hashToSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Mulberry32 — small, fast, deterministic PRNG. Good enough for plausible demo data. */
export function seededRandom(seedString: string): () => number {
  let a = hashToSeed(seedString) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickSome<T>(rng: () => number, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(rng() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD — stable per calendar day
}

/** Builds a deterministic externalRef so re-running the same day is idempotent. */
export function seededExternalRef(parts: (string | number)[]): string {
  return parts.join(':');
}
