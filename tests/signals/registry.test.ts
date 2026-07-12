import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    signalProviderConfig: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { SignalProviderRegistry } from '@/lib/signals/registry';
import type { BusinessContext } from '@/lib/signals/provider';

const findUniqueMock = prisma.signalProviderConfig.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('SignalProviderRegistry', () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it('defaults to the seeded provider when no config exists', async () => {
    findUniqueMock.mockResolvedValue(null);
    const registry = new SignalProviderRegistry();

    const provider = await registry.getActiveProvider('biz-1', 'calendar');

    expect(provider.providerId).toBe('seeded-calendar');
  });

  it('honours an explicit provider configuration', async () => {
    findUniqueMock.mockResolvedValue({ providerId: 'seeded-email' });
    const registry = new SignalProviderRegistry();

    // Requesting the 'calendar' domain but the config row happens to name
    // an email provider — the registry should not second-guess the config;
    // a real misconfiguration like this is a data problem, not a registry
    // problem, and should surface as whatever that provider actually does.
    const provider = await registry.getActiveProvider('biz-1', 'calendar');

    expect(provider.providerId).toBe('seeded-email');
  });

  it('throws for an unrecognised providerId', async () => {
    findUniqueMock.mockResolvedValue({ providerId: 'not-a-real-provider' });
    const registry = new SignalProviderRegistry();

    await expect(registry.getActiveProvider('biz-1', 'calendar')).rejects.toThrow(
      'Unknown signal provider'
    );
  });

  it('fetchAllSignals aggregates signals across every available domain', async () => {
    findUniqueMock.mockResolvedValue(null);
    const registry = new SignalProviderRegistry();

    const context: BusinessContext = {
      business: { id: 'biz-1', name: 'Meridian', industry: 'Automotive' } as BusinessContext['business'],
      goals: [],
      people: [],
    };
    const window = { from: new Date('2026-07-12'), to: new Date('2026-07-15') };

    const signals = await registry.fetchAllSignals(context, window);
    const domainsSeen = new Set(signals.map((s) => s.domain));

    expect(domainsSeen.has('calendar')).toBe(true);
    expect(domainsSeen.has('email')).toBe(true);
  });
});
