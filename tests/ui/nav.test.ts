import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavItemActive } from '@/lib/ui/nav';

describe('NAV_ITEMS', () => {
  it('contains only the two real destinations (2026-07-18 Founder decision: no coming-soon nav items)', () => {
    expect(NAV_ITEMS).toHaveLength(2);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(['/morning-brief', '/settings']);
  });
});

describe('isNavItemActive', () => {
  it('is true when the pathname exactly matches the item href', () => {
    expect(isNavItemActive('/settings', '/settings')).toBe(true);
  });

  it('is false for a different pathname', () => {
    expect(isNavItemActive('/settings', '/morning-brief')).toBe(false);
  });

  it('is false for a sub-path, not just a prefix match', () => {
    expect(isNavItemActive('/settings', '/settings/anything')).toBe(false);
  });
});
