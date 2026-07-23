import Link from 'next/link';
import { AppLogo } from '@/components/foundation/AppLogo';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Contract §7 — logo, Sign in (quiet), Get started (primary). About and
 * Contact now exist (23 July 2026) but live in the footer, not here —
 * the header's job is orientation and the primary action, not full site
 * navigation; adding every real destination here would work against the
 * same restraint that governs the rest of the public site.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-8">
        <AppLogo variant="horizontal" size="lg" href={PUBLIC_ROUTES.home} priority className="hidden md:inline-block" />
        <AppLogo variant="horizontal" size="sm" href={PUBLIC_ROUTES.home} priority className="md:hidden" />

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
