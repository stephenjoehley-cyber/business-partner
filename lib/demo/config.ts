/**
 * Demo Mode — Increment 5 (Zero-Configuration Founder Demo).
 *
 * The goal: `npm install && npm run dev` shows the complete, real Morning
 * Brief experience with no Supabase project, no database migration, and no
 * Anthropic API key. This file is the single place that decision gets made
 * — every demo adapter (`lib/demo/store.ts`, the repository modules, the
 * Supabase client stubs, `middleware.ts`) calls `isDemoMode()` rather than
 * re-deriving the same condition, the same way `confidenceRegisterFor` is
 * the one place "how confident does this sound" gets decided.
 *
 * Deliberately uses only `NEXT_PUBLIC_`-prefixed environment variables.
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time into both
 * server and client bundles, which means this exact function can be
 * imported from a Server Component, a Route Handler, *or* a Client
 * Component (e.g. `lib/supabase/client.ts`) and always agree — no prop
 * drilling required to tell a client component whether Demo Mode is on.
 */

/** Fixed identity for the single seeded demo business — every demo adapter keys its data off these two ids. */
export const DEMO_OWNER_ID = 'demo-owner';
export const DEMO_BUSINESS_ID = 'demo-business';
export const DEMO_OWNER_EMAIL = 'demo@businesspartner.local';

/**
 * Demo Mode is on when:
 * - `NEXT_PUBLIC_DEMO_MODE=true` is set explicitly, or
 * - no override is set and Supabase isn't configured (the zero-config
 *   default a founder gets from a fresh clone).
 *
 * It's off when `NEXT_PUBLIC_DEMO_MODE=false` is set explicitly — the "one
 * environment setting" the brief asks for to turn it off once real
 * infrastructure (Supabase, a migrated database) is configured, even if
 * that configuration is somehow still incomplete.
 */
export function isDemoMode(): boolean {
  const override = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (override === 'false') return false;
  if (override === 'true') return true;

  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
