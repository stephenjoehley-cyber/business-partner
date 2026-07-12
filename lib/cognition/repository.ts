import { prisma } from '@/lib/prisma';
import type { Recommendation } from './types';

/**
 * The only module that touches MorningBrief persistence directly — same
 * pattern as lib/brain/repository.ts and lib/signals/repository.ts.
 */
export async function saveRecommendation(businessId: string, recommendation: Recommendation) {
  return prisma.morningBrief.create({
    data: {
      businessId,
      generatedAt: recommendation.generatedAt,
      recommendation: recommendation.executiveSummary,
      reasoning: recommendation.reasoning,
      recommendedAction: recommendation.recommendedAction,
      confidence: recommendation.confidence,
      supportingSignalIds: recommendation.supportingSignalIds,
    },
  });
}

/** Most recent MorningBrief for a business, if one has been generated. */
export async function getLatestRecommendation(businessId: string) {
  return prisma.morningBrief.findFirst({
    where: { businessId },
    orderBy: { generatedAt: 'desc' },
  });
}
