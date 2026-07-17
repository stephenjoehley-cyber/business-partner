import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getGoogleAuthUrl } from '@/lib/signals/providers/google/oauth';
import { createOAuthState, OAUTH_STATE_COOKIE } from '@/lib/signals/providers/google/oauthState';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time. Every route in
 * this app depends on request-specific state (session, cookies, query
 * params, or POST bodies), so none of them are ever safe to
 * statically prerender — added after a real production build failure
 * (2026-07-17): Next.js attempted to export the Google Calendar
 * callback route at build time, where GOOGLE_TOKEN_ENCRYPTION_KEY and
 * a real request context don't exist, and the build failed outright.
 * See DECISIONS.md.
 */
export const dynamic = 'force-dynamic';

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
  const authUrl = getGoogleAuthUrl(state);

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
