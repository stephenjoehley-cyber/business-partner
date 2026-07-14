import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_STATE_COOKIE = 'google_oauth_nonce';

function getSigningKey(): string {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not set.');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
}

export interface OAuthStateBundle {
  state: string;
  cookieValue: string;
}

export function createOAuthState(businessId: string): OAuthStateBundle {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${businessId}.${nonce}.${expiresAt}`;
  const signature = sign(payload);
  const state = Buffer.from(`${payload}.${signature}`).toString('base64url');

  return { state, cookieValue: nonce };
}

export function verifyOAuthState(
  state: string,
  cookieValue: string | undefined,
  currentBusinessId: string
): string | null {
  if (!cookieValue) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const parts = decoded.split('.');
  if (parts.length !== 4) return null;
  const [businessId, nonce, expiresAtRaw, signature] = parts;

  const payload = `${businessId}.${nonce}.${expiresAtRaw}`;
  const expectedSignature = sign(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  if (nonce !== cookieValue) {
    return null;
  }

  if (businessId !== currentBusinessId) {
    return null;
  }

  return businessId;
}
