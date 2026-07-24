import Link from 'next/link';
import { AppLogo } from '@/components/foundation/AppLogo';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';
import { PublicMobileNav } from './PublicMobileNav';

/**
 * Founder/CPO decision, 23 July 2026: primary navigation reflects the
 * questions a prospective customer naturally asks, not the site's own
 * structure. Home introduces Business Partner; About answers "who are
 * you"; Trust answers "can I trust you with my business"; Pricing
 * answers "what does it cost" (added once the Plans & Pricing page
 * existed — not part of the originally approved sequence, placed here
 * as the natural extension of the trust question); FAQ answers the
 * remaining practical questions; Sign In serves existing customers;
 * Get Started is the primary action. Deliberate duplication with the
 * footer (About/Trust/FAQ appear in both) — the header supports
 * discovery during the journey, the footer is a consistent reference
 * point, per the Founder/CPO's own stated reasoning.
 *
 * Blog added here directly at the Founder's request, 23 July 2026 —
 * originally placed footer-only (matching Contact's precedent, a
 * supplementary surface rather than part of the core question
 * sequence), moved into the header once asked for explicitly. Placed
 * last, after FAQ, since it doesn't answer one of the core sequential
 * questions the rest of this list is built around.
 *
 * Commercial Launch Gate, 23 July 2026 — <PublicMobileNav /> added
 * (mobile-only trigger) so these same destinations are reachable
 * without relying on the footer alone on small screens.
 */
const NAV_LINKS = [
  { href: PUBLIC_ROUTES.home, label: 'Home' },
  { href: PUBLIC_ROUTES.about, label: 'About' },
  { href: PUBLIC_ROUTES.trust, label: 'Trust' },
  { href: PUBLIC_ROUTES.pricing, label: 'Pricing' },
  { href: PUBLIC_ROUTES.faq, label: 'FAQ' },
  { href: PUBLIC_ROUTES.blog, label: 'Insights' },
] as const;

export function PublicHeader() {
  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-2">
          <PublicMobileNav />
          <AppLogo variant="horizontal" size="lg" href={PUBLIC_ROUTES.home} priority className="hidden md:inline-block" />
          <AppLogo variant="horizontal" size="sm" href={PUBLIC_ROUTES.home} priority className="md:hidden" />
        </div>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="focus-ring text-sm text-ink-faint hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={PUBLIC_ROUTES.signIn}
            className="focus-ring rounded-sm px-2 py-1 text-sm text-ink-faint hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href={PUBLIC_ROUTES.getStarted}
            className="focus-ring rounded-md bg-brass px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
