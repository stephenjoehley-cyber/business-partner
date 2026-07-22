import { describe, expect, it } from 'vitest';
import { awarenessText } from '@/app/morning-brief/AwarenessLine';

describe('awarenessText', () => {
  it('states a real email count when both calendar and inbox are connected', () => {
    const result = awarenessText(true, true, 14, false);
    expect(result).toContain('14 new emails');
    expect(result).toContain('your calendar');
  });

  it('mentions only the calendar when only it is connected', () => {
    const result = awarenessText(true, false, 0, false);
    expect(result).toContain('calendar');
    expect(result).not.toContain('email');
    expect(result).not.toContain('inbox');
  });

  it('states a real email count when only the inbox is connected', () => {
    const result = awarenessText(false, true, 5, false);
    expect(result).toContain('5 new emails');
    expect(result).not.toContain('calendar');
  });

  it('uses the singular form for exactly one email', () => {
    const result = awarenessText(false, true, 1, false);
    expect(result).toContain('1 new email');
    expect(result).not.toContain('1 new emails');
  });

  it('says "your inbox" rather than the awkward "0 new emails" when the inbox is connected but genuinely nothing new arrived — found live, 20 July 2026: Awareness previously claimed to have been watching with nothing to show for it', () => {
    const result = awarenessText(false, true, 0, false);
    expect(result).toContain('your inbox');
    expect(result).not.toContain('0 new emails');
  });

  it('states plainly, never overstating, when nothing is connected yet', () => {
    const result = awarenessText(false, false, 0, false);
    expect(result).not.toContain('reviewed');
    expect(result).toContain('Settings');
  });

  it('never claims to be watching something that is not connected', () => {
    expect(awarenessText(true, false, 0, false)).not.toContain('inbox');
    expect(awarenessText(false, true, 3, false)).not.toContain('calendar');
  });

  it("never states a conclusion about whether anything qualified for attention — that remains Executive Intervention's job entirely, and stating it here could directly contradict whatever Intervention shows immediately below", () => {
    const result = awarenessText(true, true, 14, false);
    expect(result).not.toContain('nothing required');
    expect(result).not.toContain('attention');
  });

  it('frames the count as "since we last spoke," matching what it now genuinely represents — Executive Signal Capability & Claims Audit, 20 July 2026: the original count was a rolling snapshot, not a genuine delta since the previous Brief', () => {
    expect(awarenessText(true, true, 14, false)).toContain('Since we last spoke');
  });

  // --- Finance, added 22 July 2026 (Founder request) ------------------

  it('never mentions finances when no finance signal exists yet', () => {
    const result = awarenessText(true, true, 5, false);
    expect(result).not.toContain('finance');
  });

  it('mentions finances, honestly, only once a finance signal actually exists', () => {
    const result = awarenessText(true, true, 5, true);
    expect(result).toContain('finances');
  });

  it('joins all three correctly with a serial comma, matching the Founder-approved phrasing exactly', () => {
    const result = awarenessText(true, true, 0, true);
    expect(result).toBe("Since we last spoke, I've reviewed your inbox, your calendar and finances.");
  });

  it('mentions only finances when it is the sole connected/available source', () => {
    const result = awarenessText(false, false, 0, true);
    expect(result).toContain('finances');
    expect(result).not.toContain('calendar');
    expect(result).not.toContain('inbox');
  });

  it('joins finance with just one other source using "and," not a comma', () => {
    const result = awarenessText(true, false, 0, true);
    expect(result).toBe("Since we last spoke, I've reviewed your calendar and finances.");
  });
});
