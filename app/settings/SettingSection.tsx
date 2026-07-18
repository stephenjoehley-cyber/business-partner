import type { ReactNode } from 'react';

/**
 * Replaces the repeated `rounded-lg border bg-surface-card p-6` wrapper
 * every Settings section used identically (Audit C3 — "cards are the
 * default answer to every layout decision, with no weight
 * differentiation"). This component supplies only the label; each
 * section's children decide their own visual weight, so Connections and
 * the Danger Zone can carry more visual consequence than Personal.
 */
export function SettingSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-ink-faint">{label}</h2>
      {children}
    </section>
  );
}
