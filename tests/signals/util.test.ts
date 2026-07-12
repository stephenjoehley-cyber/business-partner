import { describe, expect, it } from 'vitest';
import { dayKey, pick, pickSome, seededExternalRef, seededRandom } from '@/lib/signals/providers/seeded/util';

describe('seededRandom', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRandom('business-1:calendar:2026-07-12');
    const b = seededRandom('business-1:calendar:2026-07-12');
    const sequenceA = [a(), a(), a()];
    const sequenceB = [b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it('differs for different seeds', () => {
    const a = seededRandom('business-1:calendar:2026-07-12');
    const b = seededRandom('business-2:calendar:2026-07-12');
    expect(a()).not.toEqual(b());
  });
});

describe('pick / pickSome', () => {
  it('pick always returns an item from the list', () => {
    const rng = seededRandom('seed');
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('pickSome never returns duplicates or more than requested', () => {
    const rng = seededRandom('seed');
    const items = [1, 2, 3, 4, 5];
    const result = pickSome(rng, items, 3);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });
});

describe('dayKey', () => {
  it('produces a stable YYYY-MM-DD key regardless of time-of-day', () => {
    const morning = new Date('2026-07-12T06:00:00.000Z');
    const evening = new Date('2026-07-12T23:59:00.000Z');
    expect(dayKey(morning)).toBe(dayKey(evening));
    expect(dayKey(morning)).toBe('2026-07-12');
  });
});

describe('seededExternalRef', () => {
  it('joins parts deterministically', () => {
    expect(seededExternalRef(['seeded-calendar', 'biz-1', '2026-07-12', 0])).toBe(
      'seeded-calendar:biz-1:2026-07-12:0'
    );
  });
});
