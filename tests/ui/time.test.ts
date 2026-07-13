import { describe, expect, it } from 'vitest';
import { greetingForTime, isSameDay } from '@/lib/ui/time';

describe('greetingForTime', () => {
  it('greets "Good morning" before noon', () => {
    expect(greetingForTime(new Date('2026-07-13T08:00:00'))).toBe('Good morning');
  });

  it('greets "Good afternoon" between noon and 6pm', () => {
    expect(greetingForTime(new Date('2026-07-13T14:00:00'))).toBe('Good afternoon');
  });

  it('greets "Good evening" after 6pm', () => {
    expect(greetingForTime(new Date('2026-07-13T20:00:00'))).toBe('Good evening');
  });
});

describe('isSameDay', () => {
  it('returns true for two times on the same local calendar day', () => {
    expect(isSameDay(new Date('2026-07-13T01:00:00'), new Date('2026-07-13T23:00:00'))).toBe(true);
  });

  it('returns false for two times on different calendar days', () => {
    expect(isSameDay(new Date('2026-07-13T23:59:00'), new Date('2026-07-14T00:01:00'))).toBe(false);
  });
});
