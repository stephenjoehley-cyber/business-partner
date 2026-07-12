import { prisma } from '@/lib/prisma';
import type { DraftSignal } from './types';

/**
 * The only module that touches Signal persistence directly.
 *
 * Upserts by (businessId, externalRef) — see DECISIONS.md, "Signal
 * identity" — so re-running the generation pipeline never creates
 * duplicates, regardless of whether the signal came from a seeded provider
 * or, later, a live one.
 */
export async function persistSignals(businessId: string, drafts: DraftSignal[]) {
  const persisted = await Promise.all(
    drafts.map((draft) =>
      prisma.signal.upsert({
        where: { businessId_externalRef: { businessId, externalRef: draft.externalRef } },
        update: {
          // A signal's underlying facts can change between fetches (a meeting
          // gets rescheduled, an invoice gets more overdue) — externalRef
          // identity stays stable, payload content refreshes.
          occurredAt: draft.occurredAt,
          payload: draft.payload as object,
          confidence: draft.confidence,
          personId: draft.relatedEntities.personId,
        },
        create: {
          businessId,
          domain: draft.domain,
          type: draft.type,
          occurredAt: draft.occurredAt,
          personId: draft.relatedEntities.personId,
          payload: draft.payload as object,
          sourceProviderId: draft.sourceProviderId,
          externalRef: draft.externalRef,
          confidence: draft.confidence,
        },
      })
    )
  );

  return persisted;
}

export async function getSignalsForBusiness(businessId: string) {
  return prisma.signal.findMany({
    where: { businessId },
    orderBy: { occurredAt: 'asc' },
  });
}
