/**
 * Demo Mode is visible in two places on the Morning Brief: this banner
 * (impossible to miss, explains what's seeded and what isn't) and a small
 * badge in the header where the Sign Out button normally sits (a
 * founder's eye naturally goes there looking for account state). Two
 * placements, one message — this is deliberately more visible than a
 * single small pill would be, per the brief: "can never be mistaken for
 * live data."
 *
 * Increment 6 (Executive Presence Audit, C1): the previous copy exposed
 * an environment variable and told the reader to "connect Supabase" —
 * exactly the implementation detail Asset 016 Principle 3 and the
 * Increment 6 brief both name directly. This version says only what a
 * founder needs to know: this is a demonstration, and it behaves like
 * the real thing. Reconfiguring the environment is a developer task and
 * belongs in the README, not in the product.
 */
export function DemoModeBanner() {
  return (
    <div className="mb-8 rounded border border-brass/40 bg-brass/5 px-4 py-3 text-sm text-ink-faint">
      <span className="font-mono text-xs uppercase tracking-wide text-brass-deep">Demo Mode</span>{' '}
      — you&apos;re seeing a demonstration, with a fully seeded business. Everything below — the
      recommendation, the reasoning behind it — works exactly the way it would for a real account.
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
