const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

/**
 * Every live Google integration gets its own scope and its own OAuth
 * consent flow — Operating Model §5: signing in to Business Partner and
 * authorising access to a Google product are separate trust decisions,
 * with separate consent and separate revocation paths. Adding Gmail
 * means adding a new entry here, not branching the flow itself.
 */
export type GoogleIntegration = 'calendar' | 'gmail';

const SCOPES: Record<GoogleIntegration, string> = {
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  // Deliberately gmail.metadata, not gmail.readonly — Gmail Product
  // Audit, Section 5 (17 July 2026): both are classified as "restricted"
  // scopes under Google's own verification model (confirmed directly
  // against Google's scope list, not assumed), so metadata carries no
  // lesser production-verification cost while genuinely exposing less of
  // the owner's mailbox — headers and thread structure only, never
  // message bodies. Sufficient for everything Level 1 Communication
  // Intelligence needs (Decision Backlog Q23 covers anything beyond
  // that, deliberately deferred).
  gmail: 'https://www.googleapis.com/auth/gmail.metadata',
};

function getClientCredentials(integration: GoogleIntegration = 'calendar') {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  // Google requires each registered redirect URI to match exactly what
  // was used in the original authorization request — a second live
  // integration needs its own registered callback URL, not a second env
  // var scheme invented ad hoc. Calendar's existing env var and route are
  // completely untouched by this.
  const redirectUri =
    integration === 'gmail'
      ? process.env.GOOGLE_OAUTH_GMAIL_REDIRECT_URI
      : process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth client environment variables are not fully configured.');
  }
  return { clientId, clientSecret, redirectUri };
}

export function getGoogleAuthUrl(state: string, integration: GoogleIntegration = 'calendar'): string {
  const { clientId, redirectUri } = getClientCredentials(integration);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES[integration],
    access_type: 'offline',
    // Google only issues a refresh_token the first time a given Google
    // account grants consent to this app; a second authorization from the
    // same account (e.g. after the owner's business record was recreated
    // and its previously-saved refresh token no longer exists) otherwise
    // returns an access token with no refresh token, and the callback has
    // nothing to fall back on. `prompt: 'consent'` forces Google to show
    // the consent screen and issue a fresh refresh_token every time,
    // regardless of prior grants. See Decision Backlog Q16.
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | undefined;
  expiresAt: Date;
}

export async function exchangeCodeForTokens(
  code: string,
  integration: GoogleIntegration = 'calendar'
): Promise<TokenExchangeResult> {
  const { clientId, clientSecret, redirectUri } = getClientCredentials(integration);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const { clientId, clientSecret } = getClientCredentials();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function revokeGoogleToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    });
    if (!response.ok) {
      return { success: false, error: `Google revocation returned ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error revoking Google token.',
    };
  }
}
