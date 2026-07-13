import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/signals/pipeline', () => ({
  generateSignalsForBusiness: vi.fn(),
}));

vi.mock('@/lib/cognition/pipeline', () => ({
  generateMorningBrief: vi.fn(),
}));

vi.mock('@/lib/cognition/repository', () => ({
  hasMorningBriefToday: vi.fn(),
}));

import { generateSignalsForBusiness } from '@/lib/signals/pipeline';
import { generateMorningBrief } from '@/lib/cognition/pipeline';
import { hasMorningBriefToday } from '@/lib/cognition/repository';
import { runDailyCycleForBusiness } from '@/lib/orchestrator/dailyCycle';
import type { MorningBriefResult } from '@/lib/cognition/types';

const generateSignalsForBusinessMock = generateSignalsForBusiness as unknown as ReturnType<typeof vi.fn>;
const generateMorningBriefMock = generateMorningBrief as unknown as ReturnType<typeof vi.fn>;
const hasMorningBriefTodayMock = hasMorningBriefToday as unknown as ReturnType<typeof vi.fn>;

const allClearBrief: MorningBriefResult = {
  tier: 'all_clear',
  message: 'No signals currently require executive attention.',
  generatedAt: new Date('2026-07-13T06:00:00.000Z'),
};

describe('runDailyCycleForBusiness', () => {
  beforeEach(() => {
    generateSignalsForBusinessMock.mockReset();
    generateMorningBriefMock.mockReset();
    hasMorningBriefTodayMock.mockReset();
  });

  it('skips the cycle entirely when a brief already exists today, and calls neither pipeline', async () => {
    hasMorningBriefTodayMock.mockResolvedValue(true);

    const outcome = await runDailyCycleForBusiness('biz-1');

    expect(outcome).toEqual({ ran: false });
    expect(generateSignalsForBusinessMock).not.toHaveBeenCalled();
    expect(generateMorningBriefMock).not.toHaveBeenCalled();
  });

  it('runs Observe then Recommend, in order, and returns the result when no brief exists yet today', async () => {
    hasMorningBriefTodayMock.mockResolvedValue(false);
    generateSignalsForBusinessMock.mockResolvedValue([]);
    generateMorningBriefMock.mockResolvedValue(allClearBrief);

    const outcome = await runDailyCycleForBusiness('biz-1');

    expect(outcome).toEqual({ ran: true, result: allClearBrief });
    expect(generateSignalsForBusinessMock).toHaveBeenCalledWith('biz-1');
    expect(generateMorningBriefMock).toHaveBeenCalledWith('biz-1');

    const signalsOrder = generateSignalsForBusinessMock.mock.invocationCallOrder[0];
    const briefOrder = generateMorningBriefMock.mock.invocationCallOrder[0];
    expect(signalsOrder).toBeLessThan(briefOrder);
  });

  it('catches a failure from the signal pipeline and returns it without throwing', async () => {
    hasMorningBriefTodayMock.mockResolvedValue(false);
    generateSignalsForBusinessMock.mockRejectedValue(new Error('Provider unavailable'));

    const outcome = await runDailyCycleForBusiness('biz-1');

    expect(outcome.ran).toBe(false);
    expect(outcome.error).toBe('Provider unavailable');
    expect(generateMorningBriefMock).not.toHaveBeenCalled();
  });

  it('catches a failure from the Cognitive Engine and returns it without throwing', async () => {
    hasMorningBriefTodayMock.mockResolvedValue(false);
    generateSignalsForBusinessMock.mockResolvedValue([]);
    generateMorningBriefMock.mockRejectedValue(new Error('No business found for id: biz-1'));

    const outcome = await runDailyCycleForBusiness('biz-1');

    expect(outcome.ran).toBe(false);
    expect(outcome.error).toBe('No business found for id: biz-1');
  });

  it('never throws, even on a non-Error rejection', async () => {
    hasMorningBriefTodayMock.mockResolvedValue(false);
    generateSignalsForBusinessMock.mockRejectedValue('a plain string rejection');

    const outcome = await runDailyCycleForBusiness('biz-1');

    expect(outcome.ran).toBe(false);
    expect(outcome.error).toBe('Unknown error during the daily executive cycle.');
  });
});
