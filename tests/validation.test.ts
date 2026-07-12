import { describe, expect, it } from 'vitest';
import { businessProfileSchema, goalsSchema, peopleSchema } from '@/lib/brain/validation';

describe('businessProfileSchema', () => {
  it('accepts a minimal valid profile', () => {
    const result = businessProfileSchema.safeParse({ name: 'Meridian Gearboxes', industry: 'Automotive' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = businessProfileSchema.safeParse({ name: '', industry: 'Automotive' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid website URL', () => {
    const result = businessProfileSchema.safeParse({
      name: 'Meridian',
      industry: 'Automotive',
      website: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('goalsSchema', () => {
  it('requires at least one goal', () => {
    const result = goalsSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('accepts a prioritised list', () => {
    const result = goalsSchema.safeParse([
      { description: 'Win 3 new fleet customers', priority: 1 },
      { description: 'Reduce late invoices', priority: 2 },
    ]);
    expect(result.success).toBe(true);
  });
});

describe('peopleSchema', () => {
  it('accepts an empty list (people step is skippable)', () => {
    const result = peopleSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid relationship value', () => {
    const result = peopleSchema.safeParse([{ name: 'Jane', relationship: 'friend' }]);
    expect(result.success).toBe(false);
  });

  it('accepts a valid person', () => {
    const result = peopleSchema.safeParse([{ name: 'Jane', relationship: 'customer', email: 'jane@example.com' }]);
    expect(result.success).toBe(true);
  });
});
