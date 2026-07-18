'use client';

import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { Nav } from './Nav';

/**
 * The one Radix usage in D1.1 (Founder decision, 2026-07-18: "Radix
 * Dialog limited to the mobile navigation drawer"). Handles focus
 * trapping while open, focus restoration to the trigger on close, and
 * Escape-to-dismiss — all required by Asset 021 §13.3 and §15, and all
 * genuinely hard to get right by hand.
 *
 * Takes the same accountSlot as the desktop sidebar — sign-out must stay
 * reachable on mobile too, not just in the desktop-only aside.
 */
export function MobileNav({ accountSlot }: { accountSlot: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="focus-ring inline-flex items-center justify-center rounded-md p-2 text-ink"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 bg-surface p-6 shadow-lg"
          aria-label="Navigation"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <span className="text-sm font-medium text-ink">Business Partner</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close navigation" className="focus-ring rounded-md p-2 text-ink">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Nav onNavigate={() => setOpen(false)} />
          {accountSlot}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
