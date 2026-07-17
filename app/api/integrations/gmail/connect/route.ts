import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getGoogleAuthUrl } from '@/lib/signals/providers/google/oauth';
import { createOAuthState, OAUTH_STATE_COOKIE } from '@/lib/signals/providers/google/oauthState';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time — see the identical
 * comment and the real build failure this fixed, DECISIONS.md,
 * 17 July 2026.
 */
export const dynamic = 'force-dynamic';

/**
 * Gmail's own consent flow, separate from Calendar's — Operating Model
 * §5. PRODUCTION RELEASE GATE applies (see lib/signals/providers/google/
 * gmail.ts) — until cleared, this route is only reachable for Google
 * accounts added as approved test users in Google Cloud Console; Google
 * itself enforces that restriction while the OAuth client remains in
 * Testing status.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const business = await getBusinessByOwner(user.id);
  if (!business) {
    return NextResponse.json({ error: 'Complete your business profile first' }, { status: 409 });
  }

  const { state, cookieValue } = createOAuthState(business.id);
  const authUrl = getGoogleAuthUrl(state, 'gmail');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  });
  return response;
}
