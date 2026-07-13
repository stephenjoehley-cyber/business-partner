import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `ensureDemoSeeded` and its "already seeded" flag are module-level state
 * (by design — see lib/demo/store.ts). Each test resets the module
 * registry and re-imports fresh, so tests don't leak seeded state into
 * each other.
 */
describe('ensureDemoSeeded', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('runs the real signal and cognition pipelines exactly once', async () => {
    vi.doMock('@/lib/signals/pipeline', () => ({ generateSignalsForBusiness: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@/lib/cognition/pipeline', () => ({
      generateMorningBrief: vi.fn().mockResolvedValue({ tier: 'all_clear', message: 'ok', generatedAt: new Date() }),
    }));

    const { ensureDemoSeeded } = await import('@/lib/demo/seed');
    const { generateSignalsForBusiness } = await import('@/lib/signals/pipeline');
    const { generateMorningBrief } = await import('@/lib/cognition/pipeline');

    await ensureDemoSeeded();
    await ensureDemoSeeded(); // second call should be a no-op

    expect(generateSignalsForBusiness).toHaveBeenCalledTimes(1);
    expect(generateMorningBrief).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight seeding promise across concurrent first calls', async () => {
    vi.doMock('@/lib/signals/pipeline', () => ({ generateSignalsForBusiness: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@/lib/cognition/pipeline', () => ({
      generateMorningBrief: vi.fn().mockResolvedValue({ tier: 'all_clear', message: 'ok', generatedAt: new Date() }),
    }));

    const { ensureDemoSeeded } = await import('@/lib/demo/seed');
    const { generateSignalsForBusiness } = await import('@/lib/signals/pipeline');

    await Promise.all([ensureDemoSeeded(), ensureDemoSeeded(), ensureDemoSeeded()]);

    expect(generateSignalsForBusiness).toHaveBeenCalledTimes(1);
  });

  it('lets a subsequent call retry after a failed seed attempt', async () => {
    const generateSignalsForBusiness = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue([]);
    vi.doMock('@/lib/signals/pipeline', () => ({ generateSignalsForBusiness }));
    vi.doMock('@/lib/cognition/pipeline', () => ({
      generateMorningBrief: vi.fn().mockResolvedValue({ tier: 'all_clear', message: 'ok', generatedAt: new Date() }),
    }));

    const { ensureDemoSeeded } = await import('@/lib/demo/seed');

    await expect(ensureDemoSeeded()).rejects.toThrow('boom');
    await expect(ensureDemoSeeded()).resolves.toBeUndefined();
    expect(generateSignalsForBusiness).toHaveBeenCalledTimes(2);
  });
});
