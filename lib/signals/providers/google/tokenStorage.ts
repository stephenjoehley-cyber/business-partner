import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

/**
 * Encrypts/decrypts OAuth tokens before they're stored in
 * `SignalProviderConfig.config` (Phase B, Item 5 — Google Calendar).
 *
 * Uses Node's built-in `crypto` module (AES-256-GCM) — no new dependency.
 * The key comes from `GOOGLE_TOKEN_ENCRYPTION_KEY`, any random string,
 * same category as `CRON_SECRET`: generated once, set as an environment
 * variable, never committed.
 */

function getKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not set.');
  }
  // Hashed to a fixed 32-byte key regardless of the raw secret's length —
  // the env var itself doesn't need to be exactly 32 bytes.
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
