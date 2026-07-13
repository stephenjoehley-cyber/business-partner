import { describe, expect, it } from 'vitest';
import { DEMO_BUSINESS_ID, DEMO_OWNER_ID } from '@/lib/demo/config';
import {
  addDemoPeople,
  getDemoBusinessById,
  getDemoBusinessByOwner,
  getDemoSignalsByIds,
  getDemoSignalsForBusiness,
  getLatestDemoMorningBrief,
  isDemoSeeded,
  markDemoSeeded,
  persistDemoSignals,
  replaceDemoGoals,
  saveDemoMorningBrief,
  updateDemoBusinessProfile,
} from '@/lib/demo/store';
import type { DraftSignal } from '@/lib/signals/types';
import type { MorningBriefResult } from '@/lib/cognition/types';

describe('demo business/goals/people', () => {
  it('resolves the seeded business by owner id', () => {
    const business = getDemoBusinessByOwner(DEMO_OWNER_ID);
    expect(business).not.toBeNull();
    expect(business?.id).toBe(DEMO_BUSINESS_ID);
    expect(business?.name).toBe('Meridian Gearboxes');
    expect(business?.people.length).toBeGreaterThan(0);
    expect(business?.goals.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown owner id', () => {
    expect(getDemoBusinessByOwner('someone-else')).toBeNull();
  });

  it('resolves the seeded business by business id', () => {
    expect(getDemoBusinessById(DEMO_BUSINESS_ID)?.id).toBe(DEMO_BUSINESS_ID);
    expect(getDemoBusinessById('unknown-id')).toBeNull();
  });

  it('at least one seeded person is a customer, satisfying the "realistic customer" requirement', () => {
    const business = getDemoBusinessById(DEMO_BUSINESS_ID)!;
    expect(business.people.some((p: { relationship: string }) => p.relationship === 'customer')).toBe(true);
  });

  it('updates the business profile in place', () => {
    const updated = updateDemoBusinessProfile(DEMO_BUSINESS_ID, { description: 'Updated description' });
    expect(updated.description).toBe('Updated description');
    // Restore, since demoBusiness is shared module state across this test file.
    updateDemoBusinessProfile(DEMO_BUSINESS_ID, {
      description: 'Independent gearbox specialist serving passenger and commercial vehicles.',
    });
  });

  it('replaces goals wholesale', () => {
    const before = getDemoBusinessById(DEMO_BUSINESS_ID)!.goals;
    replaceDemoGoals(DEMO_BUSINESS_ID, [{ description: 'Test goal', priority: 1 }]);
    const after = getDemoBusinessById(DEMO_BUSINESS_ID)!.goals;
    expect(after).toHaveLength(1);
    expect(after[0].description).toBe('Test goal');
    // Restore.
    replaceDemoGoals(
      DEMO_BUSINESS_ID,
      before.map((g: { description: string; priority: number }) => ({ description: g.description, priority: g.priority }))
    );
  });

  it('appends people rather than replacing them', () => {
    const before = getDemoBusinessById(DEMO_BUSINESS_ID)!.people.length;
    addDemoPeople(DEMO_BUSINESS_ID, [{ name: 'Test Person', relationship: 'prospect' }]);
    const after = getDemoBusinessById(DEMO_BUSINESS_ID)!.people;
    expect(after.length).toBe(before + 1);
    expect(after.some((p: { name: string }) => p.name === 'Test Person')).toBe(true);
  });
});

describe('demo signals', () => {
  function draft(externalRef: string, occurredAt: Date): DraftSignal {
    return {
      domain: 'email',
      type: 'email_awaiting_reply',
      occurredAt,
      relatedEntities: {},
      payload: { subject: 'Test', fromName: 'Test Sender', preview: '', requiresReply: true, daysSinceReceived: 1 },
      sourceProviderId: 'seeded-email',
      externalRef,
      confidence: 1,
    };
  }

  it('persists a signal and assigns it a stable id', () => {
    const [signal] = persistDemoSignals(DEMO_BUSINESS_ID, [draft('store-test-1', new Date('2026-07-13T00:00:00Z'))]);
    expect(signal.id).toBeTruthy();
    expect(signal.businessId).toBe(DEMO_BUSINESS_ID);
  });

  it('upserts by externalRef rather than duplicating on re-run', () => {
    const [first] = persistDemoSignals(DEMO_BUSINESS_ID, [draft('store-test-2', new Date('2026-07-13T00:00:00Z'))]);
    const [second] = persistDemoSignals(DEMO_BUSINESS_ID, [draft('store-test-2', new Date('2026-07-14T00:00:00Z'))]);

    expect(second.id).toBe(first.id); // same identity
    expect(second.occurredAt).toEqual(new Date('2026-07-14T00:00:00Z')); // facts refreshed

    const all = getDemoSignalsForBusiness(DEMO_BUSINESS_ID).filter((s) => s.externalRef === 'store-test-2');
    expect(all).toHaveLength(1);
  });

  it('getDemoSignalsByIds preserves the requested order', () => {
    const [a] = persistDemoSignals(DEMO_BUSINESS_ID, [draft('store-test-3a', new Date('2026-07-13T00:00:00Z'))]);
    const [b] = persistDemoSignals(DEMO_BUSINESS_ID, [draft('store-test-3b', new Date('2026-07-13T00:00:00Z'))]);

    const result = getDemoSignalsByIds(DEMO_BUSINESS_ID, [b.id, a.id]);
    expect(result.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('getDemoSignalsByIds returns an empty array for an empty id list', () => {
    expect(getDemoSignalsByIds(DEMO_BUSINESS_ID, [])).toEqual([]);
  });
});

describe('demo morning briefs', () => {
  it('getLatestDemoMorningBrief returns the most recently saved brief', () => {
    const brief: MorningBriefResult = {
      tier: 'all_clear',
      message: 'Nothing currently needs your attention.',
      generatedAt: new Date(),
    };
    saveDemoMorningBrief(brief);
    expect(getLatestDemoMorningBrief()).toEqual(brief);

    const newer: MorningBriefResult = {
      tier: 'all_clear',
      message: 'A newer all-clear.',
      generatedAt: new Date(),
    };
    saveDemoMorningBrief(newer);
    expect(getLatestDemoMorningBrief()).toEqual(newer);
  });
});

describe('demo seeded flag', () => {
  it('markDemoSeeded flips isDemoSeeded to true', () => {
    markDemoSeeded();
    expect(isDemoSeeded()).toBe(true);
  });
});
