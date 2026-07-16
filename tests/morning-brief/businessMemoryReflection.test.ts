import { describe, expect, it } from 'vitest';
import { sortGoalsByPriority } from '@/app/morning-brief/BusinessMemoryReflection';

describe('sortGoalsByPriority', () => {
  it('orders goals by priority ascending, lower number first (owner-ranked, per the Goal model)', () => {
    const result = sortGoalsByPriority([
      { id: 'g1', description: 'Third priority', priority: 3 },
      { id: 'g2', description: 'First priority', priority: 1 },
      { id: 'g3', description: 'Second priority', priority: 2 },
    ]);
    expect(result.map((g) => g.id)).toEqual(['g2', 'g3', 'g1']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'g1', description: 'B', priority: 2 },
      { id: 'g2', description: 'A', priority: 1 },
    ];
    const original = [...input];
    sortGoalsByPriority(input);
    expect(input).toEqual(original);
  });

  it('returns an empty array unchanged', () => {
    expect(sortGoalsByPriority([])).toEqual([]);
  });

  it('leaves a single goal unchanged', () => {
    const single = [{ id: 'g1', description: 'Only goal', priority: 1 }];
    expect(sortGoalsByPriority(single)).toEqual(single);
  });
});
