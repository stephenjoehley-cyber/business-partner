import { describe, expect, it } from 'vitest';
import { relativeDatePhrase, pluralDays } from '@/lib/shared/time';

describe('relativeDatePhrase', () => {
  it('says "today" for the same calendar date, regardless of time of day', () => {
    const now = new Date('2026-07-20T20:21:38.000Z');
    const laterToday = new Date('2026-07-20T23:00:00.000Z');
    expect(relativeDatePhrase(now, laterToday)).toBe('today');
  });

  it('says "tomorrow," never "today," for a date on the next calendar day even when only a few hours away — found live, 20 July 2026: a meeting 10.6 hours away, on the next calendar date, was called "today" by a since-removed duration-based function (relativeDayPhrase) that rounded raw hours instead of comparing calendar dates', () => {
    const now = new Date('2026-07-20T20:21:38.000Z'); // 22:21 SAST
    const meetingTomorrowMorning = new Date('2026-07-21T07:00:00.000Z'); // 09:00 SAST the next morning — 10.6 hours away
    expect(relativeDatePhrase(now, meetingTomorrowMorning)).toBe('tomorrow');
  });

  it('says "in N days" for something genuinely several calendar dates ahead', () => {
    const now = new Date('2026-07-20T09:00:00.000Z');
    const inThreeDays = new Date('2026-07-23T09:00:00.000Z');
    expect(relativeDatePhrase(now, inThreeDays)).toBe('in 3 days');
  });

  it('says "yesterday" and "N days ago" for past dates', () => {
    const now = new Date('2026-07-20T09:00:00.000Z');
    expect(relativeDatePhrase(now, new Date('2026-07-19T09:00:00.000Z'))).toBe('yesterday');
    expect(relativeDatePhrase(now, new Date('2026-07-15T09:00:00.000Z'))).toBe('5 days ago');
  });
});

describe('pluralDays', () => {
  it('uses the singular form for exactly one day', () => {
    expect(pluralDays(1)).toBe('1 day');
  });

  it('uses the plural form otherwise, including zero', () => {
    expect(pluralDays(0)).toBe('0 days');
    expect(pluralDays(5)).toBe('5 days');
  });
});
