import type { ReactNode } from 'react';
import { Nav } from './Nav';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  /** Rendered in the account slot — AccountBlock for real accounts, DemoModeBadge in Demo Mode. */
  accountSlot: ReactNode;
  contextualPanel?: ReactNode;
  children: ReactNode;
}

/**
 * The Executive Foundation's shared authenticated shell (Asset 021 §13.1 —
 * "primary navigation should remain stable across authenticated product
 * surfaces"). Applied to /morning-brief and /settings in D1.1; not to
 * /login, /signup, or /onboarding, which stay outside the authenticated
 * shell for now. Desktop shows a persistent sidebar; mobile collapses
 * into MobileNav's drawer.
 */
export function AppShell({ accountSlot, contextualPanel, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 md:hidden">
        <span className="text-sm font-medium text-ink">Business Partner</span>
        <MobileNav accountSlot={accountSlot} />
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8 md:px-8">
        <aside className="hidden w-56 shrink-0 flex-col justify-between md:flex">
          <Nav />
          {accountSlot}
        </aside>

        <div className="flex flex-1 flex-col gap-8 lg:flex-row">
          <main id="main-content" className="min-w-0 flex-1">{children}</main>
          {contextualPanel && <div className="lg:w-72 lg:shrink-0">{contextualPanel}</div>}
        </div>
      </div>
    </div>
  );
}
