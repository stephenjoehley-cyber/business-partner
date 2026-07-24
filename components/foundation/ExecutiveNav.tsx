import Link from 'next/link';
import { SignOutButton } from '@/components/foundation/SignOutButton';

/**
 * Executive Operating Dashboard, 23 July 2026 — found missing entirely
 * across all three /executive pages (Business Configuration, Blog,
 * Partners): no way to navigate between them, or sign out, without
 * typing a URL directly. Deliberately a plain list, not a styled app
 * shell — this is a small, internal, founder-only surface, and giving
 * it the same visual weight as the customer-facing product would
 * overstate what it currently is.
 */
const EXECUTIVE_LINKS = [
  { href: '/executive/business-configuration', label: 'Business Configuration' },
  { href: '/executive/blog', label: 'Blog' },
  { href: '/executive/partners', label: 'Partners' },
] as const;

export function ExecutiveNav() {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-4">
      <nav className="flex flex-wrap gap-4" aria-label="Executive Operating Dashboard">
        {EXECUTIVE_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="focus-ring text-sm text-ink-faint hover:text-ink">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <Link href="/morning-brief" className="focus-ring text-sm text-ink-faint hover:text-ink">
          Back to Business Partner
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
