import Link from 'next/link';
import { AppLogo } from '@/components/foundation/AppLogo';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Founder/CPO decision, 23 July 2026: footer provides a consistent
 * reference point throughout the site, deliberately duplicating
 * About/Trust/FAQ from the primary navigation — common practice for
 * premium B2B SaaS, per the Founder/CPO's own stated reasoning.
 *
 * Privacy, Terms, and Cookies are deliberately NOT here yet. Those
 * pages don't exist — they're Founder-gated legal content (Production
 * SaaS Completion Plan, Track B), not something Claude should draft on
 * its own authority. Contract §15's standing rule (no link to a page
 * that doesn't exist) still applies; add each one the moment its real
 * destination exists, not before.
 */
const FOOTER_LINKS = [
  { href: PUBLIC_ROUTES.about, label: 'About' },
  { href: PUBLIC_ROUTES.trust, label: 'Trust' },
  { href: PUBLIC_ROUTES.pricing, label: 'Pricing' },
  { href: PUBLIC_ROUTES.faq, label: 'FAQ' },
  { href: PUBLIC_ROUTES.contact, label: 'Contact' },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center md:px-8">
        <AppLogo variant="mark" size="sm" />
        <div className="flex flex-wrap justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="focus-ring text-sm text-ink-faint hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-ink-faint">© 2026 Business Partner. All rights reserved.</p>
      </div>
    </footer>
  );
}
