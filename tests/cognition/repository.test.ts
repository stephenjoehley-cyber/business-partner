import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    morningBrief: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getLatestRecommendation, saveRecommendation } from '@/lib/cognition/repository';
import type { Recommendation } from '@/lib/cognition/types';

const createMock = prisma.morningBrief.create as unknown as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.morningBrief.findFirst as unknown as ReturnType<typeof vi.fn>;

const recommendation: Recommendation = {
  executiveSummary: 'An email from Jane Cooper has gone unanswered for 3 days.',
  reasoning: '"Re: quotation" was received 3 days ago and still requires a reply.',
  recommendedAction: 'Reply to Jane Cooper about "Re: quotation".',
  confidence: 0.9,
  supportingSignalIds: ['sig-1'],
  generatedAt: new Date('2026-07-13T06:00:00.000Z'),
};

describe('saveRecommendation', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('persists all five recommendation components, mapped to the MorningBrief schema', async () => {
    await saveRecommendation('biz-1', recommendation);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        generatedAt: recommendation.generatedAt,
        recommendation: recommendation.executiveSummary,
        reasoning: recommendation.reasoning,
        recommendedAction: recommendation.recommendedAction,
        confidence: recommendation.confidence,
        supportingSignalIds: recommendation.supportingSignalIds,
      },
    });
  });
});

describe('getLatestRecommendation', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it('queries the most recent MorningBrief for the business, ordered by generatedAt descending', async () => {
    findFirstMock.mockResolvedValue(null);
    await getLatestRecommendation('biz-1');

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { businessId: 'biz-1' },
      orderBy: { generatedAt: 'desc' },
    });
  });
});
