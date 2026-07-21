import { describe, expect, it } from 'vitest';
import { awarenessText } from '@/app/morning-brief/AwarenessLine';

describe('awarenessText', () => {
  it('states a real email count when both calendar and inbox are connected', () => {
    const result = awarenessText(true, true, 14);
    expect(result).toContain('14 new emails');
    expect(result).toContain('your calendar');
  });

  it('mentions only the calendar when only it is connected', () => {
    const result = awarenessText(true, false, 0);
    expect(result).toContain('calendar');
    expect(result).not.toContain('email');
    expect(result).not.toContain('inbox');
  });

  it('states a real email count when only the inbox is connected', () => {
    const result = awarenessText(false, true, 5);
    expect(result).toContain('5 new emails');
    expect(result).not.toContain('calendar');
  });

  it('uses the singular form for exactly one email', () => {
    const result = awarenessText(false, true, 1);
    expect(result).toContain('1 new email');
    expect(result).not.toContain('1 new emails');
  });

  it('says "your inbox" rather than the awkward "0 new emails" when the inbox is connected but genuinely nothing new arrived — found live, 20 July 2026: Awareness previously claimed to have been watching with nothing to show for it', () => {
    const result = awarenessText(false, true, 0);
    expect(result).toContain('your inbox');
    expect(result).not.toContain('0 new emails');
  });

  it('states plainly, never overstating, when nothing is connected yet', () => {
    const result = awarenessText(false, false, 0);
    expect(result).not.toContain('reviewed');
    expect(result).toContain('Settings');
  });

  it('never claims to be watching something that is not connected', () => {
    expect(awarenessText(true, false, 0)).not.toContain('inbox');
    expect(awarenessText(false, true, 3)).not.toContain('calendar');
  });

  it('never states a conclusion about whether anything qualified for attention — that remains Executive Intervention\'s job entirely, and stating it here could directly contradict whatever Intervention shows immediately below', () => {
    const result = awarenessText(true, true, 14);
    expect(result).not.toContain('nothing required');
    expect(result).not.toContain('attention');
  });

  it('frames the count as "since we last spoke," matching what it now genuinely represents — Executive Signal Capability & Claims Audit, 20 July 2026: the original count was a rolling snapshot, not a genuine delta since the previous Brief', () => {
    expect(awarenessText(true, true, 14)).toContain('Since we last spoke');
  });
});
