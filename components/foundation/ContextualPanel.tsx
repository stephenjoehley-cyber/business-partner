import type { ReactNode } from 'react';

interface ContextualPanelProps {
  /**
   * Optional. Must orient or reassure, never repeat the page title
   * ("Your preferences. Your business." — not "Settings"). Omit rather
   * than force one.
   */
  heading?: string;
  /** One short paragraph — why this page matters. Keep it brief. */
  orientation: string;
  /** Sparse supplementary content only — not a second copy of the page. */
  children?: ReactNode;
}

/**
 * Business Partner's secondary voice — quiet executive orientation, not
 * an information panel, a marketing panel, or a restatement of the
 * page's own content (Founder decision, 2026-07-18, D1.1). A first-class
 * Executive Foundation component: Settings is its first expression, not
 * its only one. Must render gracefully with only `orientation` supplied.
 */
export function ContextualPanel({ heading, orientation, children }: ContextualPanelProps) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-surface-border bg-surface-card p-6">
      {heading && <p className="font-editorial text-lg font-medium leading-snug text-ink">{heading}</p>}
      <p className="text-sm text-ink-faint">{orientation}</p>
      {children}
    </aside>
  );
}
