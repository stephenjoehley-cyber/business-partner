import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    signal: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/demo/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/demo/config')>();
  return {
    ...actual,
    isDemoMode: vi.fn(),
  };
});

vi.mock('@/lib/demo/store', () => ({
  getDemoSignalsForBusiness: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSignalsForBusiness } from '@/lib/demo/store';
import { persistSignals, hasPriorInteractionForPerson } from '@/lib/signals/repository';
import type { DraftSignal, Signal } from '@/lib/signals/types';

const upsertMock = prisma.signal.upsert as unknown as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.signal.findFirst as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;
const getDemoSignalsForBusinessMock = getDemoSignalsForBusiness as unknown as ReturnType<typeof vi.fn>;

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

describe('hasPriorInteractionForPerson', () => {
  beforeEach(() => {
    isDemoModeMock.mockReset();
    findFirstMock.mockReset();
    getDemoSignalsForBusinessMock.mockReset();
  });

  describe('real (non-Demo-Mode) accounts', () => {
    beforeEach(() => {
      isDemoModeMock.mockReturnValue(false);
    });

    it('returns true when an earlier matching signal exists', async () => {
      findFirstMock.mockResolvedValue({ id: 'signal-earlier' });

      const result = await hasPriorInteractionForPerson(
        'biz-1',
        'person-jane',
        'calendar',
        'meeting_upcoming',
        new Date('2026-07-16T09:00:00.000Z'),
        'event-current'
      );

      expect(result).toBe(true);
      expect(findFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: 'biz-1',
            personId: 'person-jane',
            domain: 'calendar',
            type: 'meeting_upcoming',
            externalRef: { not: 'event-current' },
            occurredAt: { lt: new Date('2026-07-16T09:00:00.000Z') },
          }),
        })
      );
    });

    it('returns false when no earlier matching signal exists', async () => {
      findFirstMock.mockResolvedValue(null);

      const result = await hasPriorInteractionForPerson(
        'biz-1',
        'person-jane',
        'calendar',
        'meeting_upcoming',
        new Date('2026-07-16T09:00:00.000Z'),
        'event-current'
      );

      expect(result).toBe(false);
    });

    it('excludes the current signal itself from the comparison, by externalRef', async () => {
      findFirstMock.mockResolvedValue(null);

      await hasPriorInteractionForPerson(
        'biz-1',
        'person-jane',
        'calendar',
        'meeting_upcoming',
        new Date('2026-07-16T09:00:00.000Z'),
        'event-current'
      );

      const whereClause = findFirstMock.mock.calls[0][0].where;
      expect(whereClause.externalRef).toEqual({ not: 'event-current' });
    });
  });

  describe('Demo Mode', () => {
    beforeEach(() => {
      isDemoModeMock.mockReturnValue(true);
    });

    it('returns true when an earlier matching demo signal exists', async () => {
      const earlierSignal = {
        domain: 'calendar',
        type: 'meeting_upcoming',
        relatedEntities: { personId: 'person-jane' },
        externalRef: 'seeded-calendar:earlier',
        occurredAt: new Date('2026-07-10T09:00:00.000Z'),
      } as unknown as Signal;
      getDemoSignalsForBusinessMock.mockReturnValue([earlierSignal]);

      const result = await hasPriorInteractionForPerson(
        'biz-1',
        'person-jane',
        'calendar',
        'meeting_upcoming',
        new Date('2026-07-16T09:00:00.000Z'),
        'event-current'
      );

      expect(result).toBe(true);
    });

    it('returns false when the only matching demo signal is the current one being checked', async () => {
      const sameSignal = {
        domain: 'calendar',
        type: 'meeting_upcoming',
        relatedEntities: { personId: 'person-jane' },
        externalRef: 'event-current',
        occurredAt: new Date('2026-07-16T09:00:00.000Z'),
      } as unknown as Signal;
      getDemoSignalsForBusinessMock.mockReturnValue([sameSignal]);

      const result = await hasPriorInteractionForPerson(
        'biz-1',
        'person-jane',
        'calendar',
        'meeting_upcoming',
        new Date('2026-07-16T09:00:00.000Z'),
        'event-current'
      );

      expect(result).toBe(false);
    });
  });
});
