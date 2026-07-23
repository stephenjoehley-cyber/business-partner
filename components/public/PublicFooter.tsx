import Link from 'next/link';
import { AppLogo } from '@/components/foundation/AppLogo';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Contract §15 — minimal. Privacy/Terms/Security links still don't exist
 * yet (Founder-gated commercial/legal decisions — see Production SaaS
 * Completion Plan, 23 July 2026), so still absent, per the Contract's
 * prohibition on dead links.
 *
 * About and Contact added, 23 July 2026, now that both are real
 * destinations — the direct mailto link (added during Sprint 001, P0.1)
 * is superseded by the dedicated Contact page, which carries the same
 * email address as its own real destination rather than a footer scrap.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center md:px-8">
        <AppLogo variant="mark" size="sm" />
        <div className="flex gap-6">
          <Link href={PUBLIC_ROUTES.about} className="focus-ring text-sm text-ink-faint hover:text-ink">
            About
          </Link>
          <Link href={PUBLIC_ROUTES.contact} className="focus-ring text-sm text-ink-faint hover:text-ink">
            Contact
          </Link>
        </div>
        <p className="text-sm text-ink-faint">© 2026 Business Partner. All rights reserved.</p>
      </div>
    </footer>
  );
}
