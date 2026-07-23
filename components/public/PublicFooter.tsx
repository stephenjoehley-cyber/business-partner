import { AppLogo } from '@/components/foundation/AppLogo';

/**
 * Contract §15 — minimal. Privacy/Terms/Security links still don't exist
 * yet, so still absent, per the Contract's prohibition on dead links.
 *
 * Investor Readiness Sprint 001, P0.1 — Contact added now that a real
 * address exists (investment@business-partner.co.za). Shown as plain
 * text alongside the mailto link, not just an icon or a bare "Contact"
 * label — a plain address works even without a configured mail client,
 * and is honest about exactly where a message will go.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center md:px-8">
        <AppLogo variant="mark" size="sm" />
        <a href="mailto:investment@business-partner.co.za" className="focus-ring text-sm text-ink-faint underline underline-offset-2">
          investment@business-partner.co.za
        </a>
        <p className="text-sm text-ink-faint">© 2026 Business Partner. All rights reserved.</p>
      </div>
    </footer>
  );
}
