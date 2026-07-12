import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/brain/repository', () => ({
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/signals/repository', () => ({
  getSignalsForBusiness: vi.fn(),
}));

vi.mock('@/lib/cognition/repository', () => ({
  saveRecommendation: vi.fn(),
}));

import { getBusinessById } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { saveRecommendation } from '@/lib/cognition/repository';
import { generateRecommendation } from '@/lib/cognition/pipeline';
import type { Signal } from '@/lib/signals/types';

const getBusinessByIdMock = getBusinessById as unknown as ReturnType<typeof vi.fn>;
const getSignalsForBusinessMock = getSignalsForBusiness as unknown as ReturnType<typeof vi.fn>;
const saveRecommendationMock = saveRecommendation as unknown as ReturnType<typeof vi.fn>;

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
    occurredAt: new Date('2026-07-10T00:00:00.000Z'),
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

describe('generateRecommendation', () => {
  beforeEach(() => {
    getBusinessByIdMock.mockReset();
    getSignalsForBusinessMock.mockReset();
    saveRecommendationMock.mockReset();
    saveRecommendationMock.mockResolvedValue({ id: 'brief-1' });
  });

  it('throws when the business does not exist', async () => {
    getBusinessByIdMock.mockResolvedValue(null);
    await expect(generateRecommendation('missing-biz')).rejects.toThrow('No business found');
  });

  it('returns null and persists nothing when there are no signals to reason over', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    getSignalsForBusinessMock.mockResolvedValue([]);

    const result = await generateRecommendation('biz-1');

    expect(result).toBeNull();
    expect(saveRecommendationMock).not.toHaveBeenCalled();
  });

  it('runs Observe → Understand → Prioritise → Recommend end-to-end and persists the result', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    getSignalsForBusinessMock.mockResolvedValue([makeEmailSignal(3)]);

    const result = await generateRecommendation('biz-1');

    expect(result).not.toBeNull();
    expect(result?.executiveSummary).toContain('Jane Cooper');
    expect(result?.recommendedAction).toContain('Reply to Jane Cooper');
    expect(result?.supportingSignalIds).toEqual(['sig-email-1']);
    expect(result?.confidence).toBeGreaterThan(0);

    expect(saveRecommendationMock).toHaveBeenCalledWith('biz-1', result);
  });

  it('picks the single highest-priority signal when multiple are observed', async () => {
    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    const staleEmail = makeEmailSignal(5); // urgency saturates — should win over a fresh one
    const freshEmail: Signal = { ...makeEmailSignal(0), id: 'sig-email-2', externalRef: 'ref-email-2' };
    getSignalsForBusinessMock.mockResolvedValue([freshEmail, staleEmail]);

    const result = await generateRecommendation('biz-1');

    expect(result?.supportingSignalIds[0]).toBe(staleEmail.id);
  });
});
