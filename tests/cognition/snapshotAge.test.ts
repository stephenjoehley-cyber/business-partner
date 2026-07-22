import { describe, expect, it } from 'vitest';
import { daysSinceReportingPeriodEnd } from '@/lib/cognition/snapshotAge';

describe('daysSinceReportingPeriodEnd', () => {
  it('computes staleness from reportingPeriod.end, not from acquisition/upload time', () => {
    const now = new Date('2026-08-15T00:00:00Z');
    // Document describes a period ending 45 days before "now," regardless
    // of when it was actually uploaded — that's the whole point.
    const reportingPeriod = { start: new Date('2026-06-01T00:00:00Z'), end: new Date('2026-07-01T00:00:00Z') };

    expect(daysSinceReportingPeriodEnd(reportingPeriod, now)).toBe(45);
  });

  it('returns 0 when the reporting period ends today', () => {
    const now = new Date('2026-07-01T00:00:00Z');
    const reportingPeriod = { start: new Date('2026-06-01T00:00:00Z'), end: new Date('2026-07-01T00:00:00Z') };

    expect(daysSinceReportingPeriodEnd(reportingPeriod, now)).toBe(0);
  });

  it('returns a negative number for a reporting period that has not yet ended — an honest, not a clamped, result', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const reportingPeriod = { start: new Date('2026-06-01T00:00:00Z'), end: new Date('2026-06-30T00:00:00Z') };

    expect(daysSinceReportingPeriodEnd(reportingPeriod, now)).toBeLessThan(0);
  });
});
