import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { exchangeCodeForTokens } from '@/lib/signals/providers/google/oauth';
import { verifyOAuthState, OAUTH_STATE_COOKIE } from '@/lib/signals/providers/google/oauthState';
import { encryptToken } from '@/lib/signals/providers/google/tokenStorage';
import { getProviderConfigData, setProviderConfigData } from '@/lib/signals/config-repository';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time — see the identical
 * comment and the real build failure this fixed, DECISIONS.md,
 * 17 July 2026.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

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

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url));
  }

  const cookieNonce = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split('=')[1];

  const verifiedBusinessId = verifyOAuthState(state, cookieNonce, business.id);
  if (!verifiedBusinessId) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, 'gmail');

    const existing = await getProviderConfigData(business.id, 'email');
    const existingRefreshToken = (existing as { encryptedRefreshToken?: string } | null)?.encryptedRefreshToken;

    if (!tokens.refreshToken && !existingRefreshToken) {
      return NextResponse.redirect(new URL('/settings?gmail=error', request.url));
    }

    await setProviderConfigData(business.id, 'email', 'google-gmail', {
      encryptedAccessToken: encryptToken(tokens.accessToken),
      encryptedRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : existingRefreshToken,
      accessTokenExpiresAt: tokens.expiresAt.toISOString(),
      lastSyncedAt: null,
      lastError: null,
    });

    // Same relationship-consistent choice as Calendar's callback: land on
    // the Morning Brief, not Settings — see DECISIONS.md, "Calendar-Connect
    // Navigation Fix," 2026-07-16, for the full reasoning.
    const response = NextResponse.redirect(new URL('/morning-brief', request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url));
  }
}
