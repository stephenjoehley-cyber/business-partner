import { describe, expect, it } from 'vitest';
import { awarenessText } from '@/app/morning-brief/AwarenessLine';

describe('awarenessText', () => {
  it('mentions both calendar and inbox when both are connected', () => {
    expect(awarenessText(true, true)).toContain('calendar and inbox');
  });

  it('mentions only the calendar when only it is connected', () => {
    const result = awarenessText(true, false);
    expect(result).toContain('calendar');
    expect(result).not.toContain('inbox');
  });

  it('mentions only the inbox when only it is connected', () => {
    const result = awarenessText(false, true);
    expect(result).toContain('inbox');
    expect(result).not.toContain('calendar');
  });

  it('states plainly, never overstating, when nothing is connected yet', () => {
    const result = awarenessText(false, false);
    expect(result).not.toContain('already been watching');
    expect(result).toContain('Settings');
  });

  it('never claims to be watching something that is not connected', () => {
    expect(awarenessText(true, false)).not.toContain('inbox');
    expect(awarenessText(false, true)).not.toContain('calendar');
  });
});
