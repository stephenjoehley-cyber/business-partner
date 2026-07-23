export interface NavItem {
  href: string;
  label: string;
}

/**
 * The Executive Foundation's persistent navigation — deliberately just
 * two real destinations (Founder decision, 2026-07-18, D1.1: "navigation
 * shows real destinations only, no coming-soon nav items"). Add an entry
 * here only once its destination genuinely exists.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/morning-brief', label: 'Done & Due' },
  { href: '/settings', label: 'Memory' },
];

/** Pure so it's testable without rendering — Next's usePathname wraps this. */
export function isNavItemActive(itemHref: string, pathname: string): boolean {
  return pathname === itemHref;
}
