import { AppLogo } from '@/components/foundation/AppLogo';

/**
 * Contract §15 — minimal. No Privacy/Terms/Security/Contact links, since
 * none of those routes exist yet; adding them would create dead links,
 * which the Contract explicitly prohibits.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center md:px-8">
        <AppLogo variant="mark" size="sm" />
        <p className="text-sm text-ink-faint">© 2026 Business Partner. All rights reserved.</p>
      </div>
    </footer>
  );
}
