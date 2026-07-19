import { describe, expect, it } from 'vitest';
import { buildContinuityNote } from '@/lib/cognition/continuity';
import type { Goal, Person } from '@prisma/client';

function makeGoal(createdAt: Date): Goal {
  return { id: 'g1', businessId: 'biz-1', description: 'Win our first client', priority: 1, createdAt };
}

function makePerson(createdAt: Date): Person {
  return {
    id: 'p1',
    businessId: 'biz-1',
    name: 'Jane Cooper',
    relationship: 'customer',
    email: null,
    notes: null,
    createdAt,
  };
}

const PREVIOUS_BRIEF_AT = new Date('2026-07-18T06:00:00.000Z');

describe('buildContinuityNote', () => {
  it('returns undefined when there is no previous brief — nothing to say "since we last spoke" about', () => {
    const result = buildContinuityNote([makeGoal(new Date('2026-07-19T00:00:00.000Z'))], [], null);
    expect(result).toBeUndefined();
  });

  it('returns undefined when nothing was added since the previous brief', () => {
    const result = buildContinuityNote(
      [makeGoal(new Date('2026-07-17T00:00:00.000Z'))],
      [makePerson(new Date('2026-07-17T00:00:00.000Z'))],
      PREVIOUS_BRIEF_AT
    );
    expect(result).toBeUndefined();
  });

  it('names a single new goal, singular, with the timeless (not time-bound) closing sentence', () => {
    const result = buildContinuityNote([makeGoal(new Date('2026-07-19T00:00:00.000Z'))], [], PREVIOUS_BRIEF_AT);
    expect(result).toBe(
      "Since we last spoke, you've added a new goal. I'll take this into account in future recommendations."
    );
  });

  it('names multiple new goals with a count, plural', () => {
    const result = buildContinuityNote(
      [makeGoal(new Date('2026-07-19T00:00:00.000Z')), makeGoal(new Date('2026-07-19T01:00:00.000Z'))],
      [],
      PREVIOUS_BRIEF_AT
    );
    expect(result).toContain('2 new goals');
  });

  it('names a single new person, singular', () => {
    const result = buildContinuityNote([], [makePerson(new Date('2026-07-19T00:00:00.000Z'))], PREVIOUS_BRIEF_AT);
    expect(result).toContain('a new contact');
  });

  it('names both goals and people together in one sentence when both changed', () => {
    const result = buildContinuityNote(
      [makeGoal(new Date('2026-07-19T00:00:00.000Z'))],
      [makePerson(new Date('2026-07-19T00:00:00.000Z'))],
      PREVIOUS_BRIEF_AT
    );
    expect(result).toContain('a new goal and a new contact');
  });

  it('never phrases the note as a promise tied to a specific future moment', () => {
    const result = buildContinuityNote([makeGoal(new Date('2026-07-19T00:00:00.000Z'))], [], PREVIOUS_BRIEF_AT);
    expect(result).not.toMatch(/tomorrow/i);
  });

  it('ignores a goal or person created before the previous brief, even if others are new', () => {
    const oldGoal = makeGoal(new Date('2026-07-17T00:00:00.000Z'));
    const newGoal = makeGoal(new Date('2026-07-19T00:00:00.000Z'));
    const result = buildContinuityNote([oldGoal, newGoal], [], PREVIOUS_BRIEF_AT);
    expect(result).toContain('a new goal'); // exactly one, not two
    expect(result).not.toContain('2 new goals');
  });
});
