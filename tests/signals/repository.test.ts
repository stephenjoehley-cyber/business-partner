import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    signal: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { persistSignals } from '@/lib/signals/repository';
import type { DraftSignal } from '@/lib/signals/types';

const upsertMock = prisma.signal.upsert as unknown as ReturnType<typeof vi.fn>;

const draft: DraftSignal = {
  domain: 'calendar',
  type: 'meeting_upcoming',
  occurredAt: new Date('2026-07-12T09:00:00.000Z'),
  relatedEntities: { personId: 'person-1' },
  payload: { title: 'Discovery call' },
  sourceProviderId: 'seeded-calendar',
  externalRef: 'seeded-calendar:biz-1:2026-07-12:0',
  confidence: 1.0,
};

describe('persistSignals', () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ id: 'signal-1', businessId: 'biz-1', ...draft });
  });

  it('upserts keyed on businessId + externalRef, not just create', async () => {
    await persistSignals('biz-1', [draft]);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_externalRef: { businessId: 'biz-1', externalRef: draft.externalRef } },
      })
    );
  });

  it('is idempotent: calling it twice with the same draft still upserts by the same key both times', async () => {
    await persistSignals('biz-1', [draft]);
    await persistSignals('biz-1', [draft]);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    const [firstCallArgs] = upsertMock.mock.calls[0];
    const [secondCallArgs] = upsertMock.mock.calls[1];
    expect(firstCallArgs.where).toEqual(secondCallArgs.where);
  });
});
