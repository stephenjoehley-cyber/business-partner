import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftSignal } from '@/lib/signals/types';
import type { MorningBriefResult } from '@/lib/cognition/types';

/**
 * Demo Mode is decided per-call (`isDemoMode()` inside each repository
 * function), but `lib/prisma.ts`'s guard Proxy is constructed once at
 * module load — so these tests reset the module registry and dynamically
 * re-import with `NEXT_PUBLIC_DEMO_MODE=true` already stubbed, to prove
 * the *real* `lib/prisma.ts` (not a mock) never constructs or touches a
 * real Prisma client under Demo Mode.
 */
describe('repository layer in Demo Mode (real lib/prisma.ts, not mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getBusinessByOwner resolves the seeded demo business without touching Prisma', async () => {
    const { getBusinessByOwner } = await import('@/lib/brain/repository');
    const { DEMO_OWNER_ID } = await import('@/lib/demo/config');

    const business = await getBusinessByOwner(DEMO_OWNER_ID);

    expect(business?.name).toBe('Meridian Gearboxes');
    expect(business?.people.length).toBeGreaterThan(0);
  });

  it('accessing prisma directly while Demo Mode is active throws the guard error (proves the branch, not the Proxy, is what keeps callers safe)', async () => {
    const { prisma } = await import('@/lib/prisma');
    expect(() => prisma.business).toThrow(/Demo Mode is active/);
  });

  it('signal repository persists and retrieves through the demo store', async () => {
    const { persistSignals, getSignalsForBusiness } = await import('@/lib/signals/repository');
    const { DEMO_BUSINESS_ID } = await import('@/lib/demo/config');

    const draft: DraftSignal = {
      domain: 'email',
      type: 'email_awaiting_reply',
      occurredAt: new Date('2026-07-13T00:00:00Z'),
      relatedEntities: {},
      payload: { subject: 'Test', fromName: 'Test', preview: '', requiresReply: true, daysSinceReceived: 1 },
      sourceProviderId: 'seeded-email',
      externalRef: 'integration-test-signal',
      confidence: 1,
    };

    await persistSignals(DEMO_BUSINESS_ID, [draft]);
    const signals = await getSignalsForBusiness(DEMO_BUSINESS_ID);

    expect(signals.some((s) => s.externalRef === 'integration-test-signal')).toBe(true);
  });

  it('config-repository always resolves to "no override" in Demo Mode', async () => {
    const { getConfiguredProviderId } = await import('@/lib/signals/config-repository');
    const { DEMO_BUSINESS_ID } = await import('@/lib/demo/config');

    await expect(getConfiguredProviderId(DEMO_BUSINESS_ID, 'calendar')).resolves.toBeNull();
  });

  it('cognition repository saves and retrieves a MorningBriefResult through the demo store', async () => {
    const { saveMorningBrief, getLatestMorningBrief } = await import('@/lib/cognition/repository');
    const { DEMO_BUSINESS_ID } = await import('@/lib/demo/config');

    const brief: MorningBriefResult = {
      tier: 'all_clear',
      message: 'Nothing currently needs your attention.',
      generatedAt: new Date(),
    };

    await saveMorningBrief(DEMO_BUSINESS_ID, brief);
    const latest = await getLatestMorningBrief(DEMO_BUSINESS_ID);

    expect(latest).toEqual(brief);
  });
});
