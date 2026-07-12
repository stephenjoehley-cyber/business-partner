import { getBusinessById } from '@/lib/brain/repository';
import { SignalProviderRegistry } from './registry';
import { persistSignals } from './repository';
import type { TimeWindow } from './provider';
import type { Signal } from './types';

const registry = new SignalProviderRegistry();

/**
 * Generates and persists signals for a business across every configured
 * domain, for the given window (defaults to "now through the next 3 days" —
 * enough to populate an upcoming Morning Brief).
 *
 * This function's signature — businessId in, Signals persisted — is exactly
 * what the Executive Orchestrator (Increment 5) will call on a schedule.
 * Increment 2 exposes it manually via a Route Handler; nothing here changes
 * when the trigger becomes cron instead of a click. See DECISIONS.md.
 */
export async function generateSignalsForBusiness(
  businessId: string,
  window?: TimeWindow
): Promise<Signal[]> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error(`No business found for id: ${businessId}`);
  }

  const effectiveWindow: TimeWindow = window ?? {
    from: new Date(),
    to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  };

  const drafts = await registry.fetchAllSignals(
    { business, goals: business.goals, people: business.people },
    effectiveWindow
  );

  const persisted = await persistSignals(businessId, drafts);

  return persisted.map((row) => ({
    id: row.id,
    businessId: row.businessId,
    domain: row.domain as Signal['domain'],
    type: row.type,
    occurredAt: row.occurredAt,
    relatedEntities: { personId: row.personId ?? undefined },
    payload: row.payload as Signal['payload'],
    sourceProviderId: row.sourceProviderId,
    externalRef: row.externalRef,
    confidence: row.confidence,
    createdAt: row.createdAt,
  }));
}
