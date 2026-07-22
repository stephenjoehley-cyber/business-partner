import type { Signal } from '@/lib/signals/types';
import type { DebtorSignalPayload, CreditorSignalPayload } from '@/lib/signals/types';

/**
 * Product Audit — F1: Aged Debtors/Creditors Structured Extractor, 22 July
 * 2026 (Founder + CPO). Replaces F0's honest stub with the first real
 * finance world-inherent-consequence rule, recorded explicitly as a
 * **versioned F1 domain policy**, not universal doctrine — the specific
 * numbers below are a product judgement call for this document type,
 * expected to be revisited, not a permanent constitutional rule.
 *
 * Debtor: world-inherent once overdue by at least one day. Not thirty —
 * thirty days (or any severity threshold) is a Prioritise-stage input
 * (amount, age, relationship, recurrence, concentration all belong there),
 * not the point at which the consequence first becomes real. An invoice
 * one day overdue is already a genuine, structural fact about the
 * business's cash position.
 *
 * Creditor: world-inherent when overdue, or due within 7 calendar days —
 * an unpaid supplier obligation about to become overdue carries real
 * relationship/penalty risk regardless of whether the supplier is a known
 * Person.
 *
 * Both computed fresh, from payload.dueDate against today — never a
 * stored day-count, the same lesson already applied twice this session
 * (email's daysSince, and this domain's own now-replaced daysOverdue
 * field).
 */
const CREDITOR_DUE_SOON_WINDOW_DAYS = 7;

/**
 * Found while writing this function's own tests, 22 July 2026 — the same
 * bug class already found and fixed once this session for calendar
 * (relativeDayPhrase vs relativeDatePhrase): diffing raw timestamps and
 * flooring gives a wrong answer whenever "now" has a nonzero
 * time-of-day and the due date sits exactly on a day boundary — an
 * invoice due today, checked at noon, floored to -0.5 days and was
 * being treated as already overdue. Comparing calendar-date boundaries
 * (UTC midnight to UTC midnight) instead of raw durations fixes it,
 * exactly as it did for calendar.
 */
function daysUntilDue(dueDate: Date, now: Date): number {
  const dueDayStart = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const nowDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueDayStart - nowDayStart) / (1000 * 60 * 60 * 24));
}

export function hasWorldInherentConsequence(signal: Signal): boolean {
  if (signal.domain !== 'finance') return false;
  const payload = signal.payload as DebtorSignalPayload | CreditorSignalPayload;
  const dueDate = new Date(payload.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  const daysUntil = daysUntilDue(dueDate, new Date());

  if (payload.role === 'debtor') return daysUntil < 0; // overdue by at least 1 day
  if (payload.role === 'creditor') return daysUntil <= CREDITOR_DUE_SOON_WINDOW_DAYS;
  return false;
}
