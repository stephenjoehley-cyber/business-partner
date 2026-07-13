/**
 * Demo Mode is visible in two places on the Morning Brief: this banner
 * (impossible to miss, explains what's seeded and what isn't) and a small
 * badge in the header where the Sign Out button normally sits (a
 * founder's eye naturally goes there looking for account state). Two
 * placements, one message — this is deliberately more visible than a
 * single small pill would be, per the brief: "can never be mistaken for
 * live data."
 */
export function DemoModeBanner() {
  return (
    <div className="mb-8 rounded border border-brass/40 bg-brass/5 px-4 py-3 text-sm text-ink-faint">
      <span className="font-mono text-xs uppercase tracking-wide text-brass-deep">Demo Mode</span>{' '}
      — seeded business data, no account required. Connect Supabase and set{' '}
      <code className="rounded bg-surface-border/60 px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_DEMO_MODE=false</code>{' '}
      to run against a real account.
    </div>
  );
}

export function DemoModeBadge() {
  return (
    <span className="font-mono text-xs uppercase tracking-wide text-brass-deep" title="Seeded data — not a live account">
      Demo Mode
    </span>
  );
}
