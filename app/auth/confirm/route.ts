import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Partner Capability, 23 July 2026 — found live during Founder
 * Acceptance: Supabase's default invite email uses {{ .ConfirmationURL }},
 * which delivers the session as a URL hash fragment
 * (#access_token=...&type=invite). @supabase/ssr's browser client
 * defaults to PKCE flow specifically, and actually rejects hash-
 * fragment tokens as a flow mismatch rather than processing them — a
 * client-side fix (reading the hash directly) would be fighting the
 * library's own design, not working with it.
 *
 * The robust fix, and the one Supabase's own current docs recommend for
 * exactly this SSR setup: the invite email template must be changed
 * (Supabase dashboard, Authentication -> Email Templates -> Invite
 * user) to link here instead of the default:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&redirect_to=/partner
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
