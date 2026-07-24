import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Partner Capability, 23 July 2026 — found live during Founder
 * Acceptance: Supabase's default invite email (inviteUserByEmail)
 * delivers the session as a URL hash fragment (#access_token=...&type=
 * invite). @supabase/ssr's browser client defaults to PKCE flow
 * specifically, and actually rejects hash-fragment tokens as a flow
 * mismatch rather than processing them — a client-side fix (reading
 * the hash directly) would be fighting the library's own design, not
 * working with it.
 *
 * The robust fix, matching how every other auth flow in this codebase
 * already works: lib/executive/partnerInvite.ts uses generateLink()
 * instead of inviteUserByEmail — it produces the same invite token
 * without sending any email at all, avoiding a second problem found at
 * the same time (this Supabase project has no custom SMTP configured,
 * and Supabase does not allow editing any email template, including
 * the link format this route needs, without one). The link this route
 * expects is constructed directly in code:
 *
 *   https://business-partner.co.za/auth/confirm?token_hash=<hashed_token>&type=invite&redirect_to=/partner
 *
 * This route then verifies the token_hash server-side and lets
 * Supabase's server client set the session via cookies — the same
 * cookie-based session mechanism every other route in this codebase
 * already relies on, not a separate one invented for this flow.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const redirectTo = searchParams.get('redirect_to') ?? '/';

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
