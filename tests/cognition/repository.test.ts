import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    morningBrief: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  getAllMorningBriefsForBusiness,
  getLatestMorningBrief,
  hasMorningBriefToday,
  saveMorningBrief,
  toResult,
} from '@/lib/cognition/repository';
import type { MorningBriefResult } from '@/lib/cognition/types';

const createMock = prisma.morningBrief.create as unknown as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.morningBrief.findFirst as unknown as ReturnType<typeof vi.fn>;
const findManyMock = prisma.morningBrief.findMany as unknown as ReturnType<typeof vi.fn>;

const confidentBrief: MorningBriefResult = {
  tier: 'confident_recommendation',
  executiveSummary: 'An email from Jane Cooper has gone unanswered for 3 days.',
  reasoning: '"Re: quotation" was received 3 days ago and still requires a reply.',
  recommendedAction: 'Reply to Jane Cooper about "Re: quotation".',
  confidence: 0.9,
  supportingSignalIds: ['sig-1'],
  generatedAt: new Date('2026-07-13T06:00:00.000Z'),
};

const lowConfidenceBrief: MorningBriefResult = {
  tier: 'low_confidence_insight',
  executiveSummary: 'A generic enquiry was received.',
  reasoning: 'Not enough context to be confident this needs urgent attention.',
  confidence: 0.4,
  supportingSignalIds: ['sig-2'],
  generatedAt: new Date('2026-07-13T06:00:00.000Z'),
};

const allClearBrief: MorningBriefResult = {
  tier: 'all_clear',
  message: 'No signals currently require executive attention.',
  generatedAt: new Date('2026-07-13T06:00:00.000Z'),
};

describe('saveMorningBrief', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('persists a confident_recommendation with all its fields, and a null message', async () => {
    await saveMorningBrief('biz-1', confidentBrief);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        generatedAt: confidentBrief.generatedAt,
        tier: 'confident_recommendation',
        recommendation: confidentBrief.executiveSummary,
        reasoning: confidentBrief.reasoning,
        recommendedAction: confidentBrief.recommendedAction,
        confidence: confidentBrief.confidence,
        supportingSignalIds: confidentBrief.supportingSignalIds,
        message: null,
        continuityNote: null,
        recognisedSignals: null,
      },
    });
  });

  it('persists a low_confidence_insight with a null recommendedAction', async () => {
    await saveMorningBrief('biz-1', lowConfidenceBrief);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        generatedAt: lowConfidenceBrief.generatedAt,
        tier: 'low_confidence_insight',
        recommendation: lowConfidenceBrief.executiveSummary,
        reasoning: lowConfidenceBrief.reasoning,
        recommendedAction: null,
        confidence: lowConfidenceBrief.confidence,
        supportingSignalIds: lowConfidenceBrief.supportingSignalIds,
        message: null,
        continuityNote: null,
        recognisedSignals: null,
      },
    });
  });

  it('persists an all_clear brief with every recommendation-shaped field null', async () => {
    await saveMorningBrief('biz-1', allClearBrief);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        generatedAt: allClearBrief.generatedAt,
        tier: 'all_clear',
        recommendation: null,
        reasoning: null,
        recommendedAction: null,
        confidence: null,
        supportingSignalIds: [],
        message: allClearBrief.message,
        continuityNote: null,
        recognisedSignals: null,
      },
    });
  });
});

describe('getLatestMorningBrief', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it('queries the most recent MorningBrief for the business, ordered by generatedAt descending', async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await getLatestMorningBrief('biz-1');

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { businessId: 'biz-1' },
      orderBy: { generatedAt: 'desc' },
    });
    expect(result).toBeNull();
  });

  it('maps a persisted confident_recommendation row back into the typed result', async () => {
    findFirstMock.mockResolvedValue({
      id: 'brief-1',
      tier: 'confident_recommendation',
      recommendation: confidentBrief.executiveSummary,
      reasoning: confidentBrief.reasoning,
      recommendedAction: confidentBrief.recommendedAction,
      confidence: confidentBrief.confidence,
      supportingSignalIds: confidentBrief.supportingSignalIds,
      message: null,
      generatedAt: confidentBrief.generatedAt,
    });

    const result = await getLatestMorningBrief('biz-1');
    expect(result).toEqual(confidentBrief);
  });

  it('maps a persisted all_clear row back into the typed result', async () => {
    findFirstMock.mockResolvedValue({
      id: 'brief-2',
      tier: 'all_clear',
      recommendation: null,
      reasoning: null,
      recommendedAction: null,
      confidence: null,
      supportingSignalIds: [],
      message: allClearBrief.message,
      generatedAt: allClearBrief.generatedAt,
    });

    const result = await getLatestMorningBrief('biz-1');
    expect(result).toEqual(allClearBrief);
  });
});

describe('hasMorningBriefToday', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it('queries for a MorningBrief within the UTC day of the given reference date', async () => {
    findFirstMock.mockResolvedValue(null);

    const reference = new Date('2026-07-13T14:00:00.000Z');
    await hasMorningBriefToday('biz-1', reference);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        businessId: 'biz-1',
        generatedAt: {
          gte: new Date('2026-07-13T00:00:00.000Z'),
          lt: new Date('2026-07-14T00:00:00.000Z'),
        },
      },
    });
  });

  it('returns false when no brief exists yet today', async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await hasMorningBriefToday('biz-1', new Date('2026-07-13T14:00:00.000Z'));
    expect(result).toBe(false);
  });

  it('returns true when a brief already exists today', async () => {
    findFirstMock.mockResolvedValue({ id: 'brief-existing' });
    const result = await hasMorningBriefToday('biz-1', new Date('2026-07-13T14:00:00.000Z'));
    expect(result).toBe(true);
  });
});

describe('toResult', () => {
  it('throws on a corrupt confident_recommendation row missing a required field', () => {
    expect(() =>
      toResult({
        id: 'brief-3',
        tier: 'confident_recommendation',
        recommendation: 'Summary',
        reasoning: null,
        recommendedAction: 'Do the thing',
        confidence: 0.9,
        supportingSignalIds: [],
        message: null,
        generatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ).toThrow('missing required fields');
  });

  it('throws on an unknown tier', () => {
    expect(() =>
      toResult({
        id: 'brief-4',
        tier: 'mystery_tier',
        recommendation: null,
        reasoning: null,
        recommendedAction: null,
        confidence: null,
        supportingSignalIds: [],
        message: null,
        generatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ).toThrow('unknown tier');
  });
});

describe('getAllMorningBriefsForBusiness', () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it('returns every brief for the business, oldest first, correctly typed by tier', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 'brief-1',
        tier: 'all_clear',
        recommendation: null,
        reasoning: null,
        recommendedAction: null,
        confidence: null,
        supportingSignalIds: [],
        message: 'No signals currently require executive attention.',
        generatedAt: new Date('2026-07-01T06:00:00.000Z'),
      },
    ]);

    const result = await getAllMorningBriefsForBusiness('biz-1');

    expect(findManyMock).toHaveBeenCalledWith({
      where: { businessId: 'biz-1' },
      orderBy: { generatedAt: 'asc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe('all_clear');
  });

  it('returns an empty array when no briefs exist yet', async () => {
    findManyMock.mockResolvedValue([]);

    const result = await getAllMorningBriefsForBusiness('biz-1');

    expect(result).toEqual([]);
  });
});
