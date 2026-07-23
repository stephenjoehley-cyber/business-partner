'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { AppLogo } from '@/components/foundation/AppLogo';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Commercial Launch Gate, 23 July 2026 (Founder + CPO) — found during
 * the return to website completion: About, Trust, and FAQ were only
 * reachable via the footer on mobile, since the primary nav added
 * alongside them was desktop-only from the start. Given the launch
 * gate explicitly requires complete mobile usability, this moved from
 * a disclosed simplification to a real gap needing a fix.
 *
 * Reuses the exact same mechanism as components/foundation/MobileNav.tsx
 * (Radix Dialog, the one Radix usage the Founder approved specifically
 * for mobile navigation drawers, 2026-07-18) rather than introducing a
 * second pattern for the same job. Focus trapping, Escape-to-dismiss,
 * and focus restoration on close all come from Radix directly, same as
 * the authenticated app's own drawer.
 */
const NAV_LINKS = [
  { href: PUBLIC_ROUTES.home, label: 'Home' },
  { href: PUBLIC_ROUTES.about, label: 'About' },
  { href: PUBLIC_ROUTES.trust, label: 'Trust' },
  { href: PUBLIC_ROUTES.pricing, label: 'Pricing' },
  { href: PUBLIC_ROUTES.faq, label: 'FAQ' },
] as const;

export function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="focus-ring inline-flex items-center justify-center rounded-md p-2 text-ink md:hidden"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface p-6 shadow-lg" aria-label="Navigation">
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <AppLogo variant="horizontal" size="sm" href={PUBLIC_ROUTES.home} onClick={() => setOpen(false)} />
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close navigation" className="focus-ring rounded-md p-2 text-ink">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="mt-5 flex flex-1 flex-col gap-1" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-2 text-sm text-ink-faint hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
