import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { exchangeCodeForTokens } from '@/lib/signals/providers/google/oauth';
import { verifyOAuthState, OAUTH_STATE_COOKIE } from '@/lib/signals/providers/google/oauthState';
import { encryptToken } from '@/lib/signals/providers/google/tokenStorage';
import { getProviderConfigData, setProviderConfigData } from '@/lib/signals/config-repository';

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
    return NextResponse.redirect(new URL('/settings?calendar=error', request.url));
  }

  const cookieNonce = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split('=')[1];

  const verifiedBusinessId = verifyOAuthState(state, cookieNonce, business.id);
  if (!verifiedBusinessId) {
    return NextResponse.redirect(new URL('/settings?calendar=error', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const existing = await getProviderConfigData(business.id, 'calendar');
    const existingRefreshToken = (existing as { encryptedRefreshToken?: string } | null)?.encryptedRefreshToken;

    if (!tokens.refreshToken && !existingRefreshToken) {
      return NextResponse.redirect(new URL('/settings?calendar=error', request.url));
    }

    await setProviderConfigData(business.id, 'calendar', 'google-calendar', {
      encryptedAccessToken: encryptToken(tokens.accessToken),
      encryptedRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : existingRefreshToken,
      accessTokenExpiresAt: tokens.expiresAt.toISOString(),
      lastSyncedAt: null,
      lastError: null,
    });

    // Redirect to the Morning Brief, not Settings, on success — Settings
    // is for deliberately managing a connection (checking status,
    // disconnecting), not a forced waypoint after completing an action
    // framed entirely in Morning Brief terms. BusinessMemoryReflection's
    // existing "already connected" closing sentence (calendarConnected)
    // already serves as the confirmation the moment the owner lands back
    // here — no separate success message is needed.
    const response = NextResponse.redirect(new URL('/morning-brief', request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(new URL('/settings?calendar=error', request.url));
  }
}
