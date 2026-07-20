import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/brain/repository', () => ({
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/signals/repository', () => ({
  getSignalsForBusiness: vi.fn(),
}));

vi.mock('@/lib/cognition/repository', () => ({
  saveMorningBrief: vi.fn(),
  getLatestMorningBrief: vi.fn(),
}));

import { getBusinessById } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { saveMorningBrief, getLatestMorningBrief } from '@/lib/cognition/repository';
import { generateMorningBrief } from '@/lib/cognition/pipeline';
import type { Signal } from '@/lib/signals/types';

const getBusinessByIdMock = getBusinessById as unknown as ReturnType<typeof vi.fn>;
const getSignalsForBusinessMock = getSignalsForBusiness as unknown as ReturnType<typeof vi.fn>;
const saveMorningBriefMock = saveMorningBrief as unknown as ReturnType<typeof vi.fn>;
const getLatestMorningBriefMock = getLatestMorningBrief as unknown as ReturnType<typeof vi.fn>;

const BUSINESS = {
  id: 'biz-1',
  name: 'Meridian Gearboxes',
  industry: 'Automotive',
  goals: [],
  people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' }],
};

function makeEmailSignal(daysSinceReceived: number): Signal {
  return {
    id: 'sig-email-1',
    businessId: 'biz-1',
    domain: 'email',
    type: daysSinceReceived >= 2 ? 'email_awaiting_reply_overdue' : 'email_awaiting_reply',
    // Found live, 19 July 2026: the email interpreter now computes days-
    // since fresh from occurredAt vs the real current time, rather than
    // trusting payload.daysSinceReceived (frozen at ingestion) — see
    // lib/cognition/interpreters/email.ts. occurredAt is constructed
    // relative to Date.now() here for exactly that reason.
    occurredAt: new Date(Date.now() - daysSinceReceived * 24 * 60 * 60 * 1000),
    relatedEntities: { personId: 'person-1' },
    payload: {
      subject: 'Re: quotation',
      fromName: 'Jane Cooper',
      preview: 'Checking in',
      requiresReply: true,
      daysSinceReceived,
    },
    sourceProviderId: 'seeded-email',
    externalRef: 'ref-email-1',
    confidence: 1.0,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
  };
}

describe('generateMorningBrief', () => {
  beforeEach(() => {
    getBusinessByIdMock.mockReset();
    getSignalsForBusinessMock.mockReset();
    saveMorningBriefMock.mockReset();
    saveMorningBriefMock.mockResolvedValue({ id: 'brief-1' });
    getLatestMorningBriefMock.mockReset();
    getLatestMorningBriefMock.mockResolvedValue(null);
  });

  it('throws when the business does not exist', async () => {
    getBusinessByIdMock.mockResolvedValue(null);
    await expect(generateMorningBrief('missing-biz')).rejects.toThrow('No business found');
  });

  it('returns an all_clear tier and still persists it when there are no signals to reason over', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    getSignalsForBusinessMock.mockResolvedValue([]);

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('all_clear');
    expect(saveMorningBriefMock).toHaveBeenCalledWith('biz-1', result);
  });

  it('runs Observe → Understand → Prioritise → Recommend end-to-end and persists a confident recommendation', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    getSignalsForBusinessMock.mockResolvedValue([makeEmailSignal(3)]);

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      expect(result.executiveSummary).toContain('Jane Cooper');
      expect(result.recommendedAction).toContain('Reply to Jane Cooper');
      expect(result.supportingSignalIds).toEqual(['sig-email-1']);
      expect(result.confidence).toBeGreaterThan(0);
    }

    expect(saveMorningBriefMock).toHaveBeenCalledWith('biz-1', result);
  });

  it('picks the single highest-priority signal when multiple are observed', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    const staleEmail = makeEmailSignal(5); // urgency saturates — should win over a fresh one
    const freshEmail: Signal = { ...makeEmailSignal(0), id: 'sig-email-2', externalRef: 'ref-email-2' };
    getSignalsForBusinessMock.mockResolvedValue([freshEmail, staleEmail]);

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      expect(result.supportingSignalIds[0]).toBe(staleEmail.id);
    }
  });

  it('attaches a continuityNote when a goal was added after the previous brief — Executive Presence Increment 1', async () => {
    const businessWithNewGoal = {
      ...BUSINESS,
      goals: [
        {
          id: 'g1',
          businessId: 'biz-1',
          description: 'Win our first client',
          priority: 1,
          createdAt: new Date('2026-07-19T00:00:00.000Z'),
        },
      ],
    };
    getBusinessByIdMock.mockResolvedValue(businessWithNewGoal);
    getSignalsForBusinessMock.mockResolvedValue([makeEmailSignal(3)]);
    getLatestMorningBriefMock.mockResolvedValue({
      tier: 'all_clear',
      message: 'No signals currently require executive attention.',
      generatedAt: new Date('2026-07-18T06:00:00.000Z'),
    });

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      expect(result.continuityNote).toContain('a new goal');
    }
  });

  it('never attaches a continuityNote to an all_clear brief — Business Memory Reflection already covers that tier fully', async () => {
    const businessWithNewGoal = {
      ...BUSINESS,
      goals: [
        {
          id: 'g1',
          businessId: 'biz-1',
          description: 'Win our first client',
          priority: 1,
          createdAt: new Date('2026-07-19T00:00:00.000Z'),
        },
      ],
    };
    getBusinessByIdMock.mockResolvedValue(businessWithNewGoal);
    getSignalsForBusinessMock.mockResolvedValue([]);
    getLatestMorningBriefMock.mockResolvedValue({
      tier: 'all_clear',
      message: 'No signals currently require executive attention.',
      generatedAt: new Date('2026-07-18T06:00:00.000Z'),
    });

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('all_clear');
    expect('continuityNote' in result).toBe(false);
  });

  it('omits continuityNote entirely when nothing has changed since the previous brief', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    getSignalsForBusinessMock.mockResolvedValue([makeEmailSignal(3)]);
    getLatestMorningBriefMock.mockResolvedValue({
      tier: 'confident_recommendation',
      executiveSummary: 'Previous summary',
      reasoning: 'Previous reasoning',
      recommendedAction: 'Previous action',
      confidence: 0.9,
      supportingSignalIds: ['sig-old'],
      generatedAt: new Date('2026-07-19T05:00:00.000Z'), // after BUSINESS's goals/people were created
    });

    const result = await generateMorningBrief('biz-1');

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      expect(result.continuityNote).toBeUndefined();
    }
  });
});
