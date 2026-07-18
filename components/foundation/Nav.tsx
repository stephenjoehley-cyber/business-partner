'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Settings as SettingsIcon } from 'lucide-react';
import { NAV_ITEMS, isNavItemActive } from '@/lib/ui/nav';

const ICONS = {
  '/morning-brief': Sun,
  '/settings': SettingsIcon,
} as const;

/**
 * Primary navigation — the two real destinations only (see lib/ui/nav.ts).
 * Shared by AppShell's desktop sidebar and MobileNav's drawer, so the two
 * never drift apart. Active state is communicated through more than
 * colour alone (weight + the brass accent), per Asset 021 §13.2.
 */
export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-3">
      {/*
        gap-3 = 12px (Tailwind's existing default spacing scale, not a
        new token) — Founder Experience Review finding: at the previous
        gap-1 (4px), adjacent items' hover/focus states visually merged.
        12px per item lets each destination read as independent.
      */}
      {NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item.href, pathname);
        const Icon = ICONS[item.href as keyof typeof ICONS];

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              isActive ? 'font-medium text-ink' : 'text-ink-faint hover:text-ink'
            }`}
          >
            <Icon size={18} className={isActive ? 'text-brass' : 'text-ink-faint'} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
