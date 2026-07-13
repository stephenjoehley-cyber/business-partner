import { prisma } from '@/lib/prisma';
import type { Signal as PrismaSignal } from '@prisma/client';
import type { DraftSignal, Signal, SignalDomain } from './types';

/**
 * The only module that touches Signal persistence directly.
 *
 * Upserts by (businessId, externalRef) — see DECISIONS.md, "Signal
 * identity" — so re-running the generation pipeline never creates
 * duplicates, regardless of whether the signal came from a seeded provider
 * or, later, a live one.
 */

/**
 * Maps a raw Prisma row to the domain `Signal` shape (`relatedEntities`
 * instead of a flat `personId`). Centralised here — rather than in the
 * pipeline or, worse, duplicated at every call site — because this
 * repository is the single place allowed to know what a persisted Signal
 * row looks like. Added in Increment 3: the Cognitive Engine reads
 * `getSignalsForBusiness` and needs the same typed shape the pipeline
 * already produced in-memory before this fix.
 */
function toSignal(row: PrismaSignal): Signal {
  return {
    id: row.id,
    businessId: row.businessId,
    domain: row.domain as SignalDomain,
    type: row.type,
    occurredAt: row.occurredAt,
    relatedEntities: { personId: row.personId ?? undefined },
    payload: row.payload as Signal['payload'],
    sourceProviderId: row.sourceProviderId,
    externalRef: row.externalRef,
    confidence: row.confidence,
    createdAt: row.createdAt,
  };
}

export async function persistSignals(businessId: string, drafts: DraftSignal[]): Promise<Signal[]> {
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

  return persisted.map(toSignal);
}

export async function getSignalsForBusiness(businessId: string): Promise<Signal[]> {
  const rows = await prisma.signal.findMany({
    where: { businessId },
    orderBy: { occurredAt: 'asc' },
  });
  return rows.map(toSignal);
}

/**
 * Resolves a MorningBriefResult's `supportingSignalIds` back into full
 * Signal records, scoped to the business — so the Morning Brief can render
 * *why* a recommendation was made, not just assert that it's traceable.
 */
export async function getSignalsByIds(businessId: string, ids: string[]): Promise<Signal[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.signal.findMany({
    where: { businessId, id: { in: ids } },
  });
  const byId = new Map(rows.map((row: PrismaSignal) => [row.id, toSignal(row)]));
  // Preserve the order supportingSignalIds specified (most relevant first).
  return ids.map((id) => byId.get(id)).filter((s): s is Signal => Boolean(s));
}
