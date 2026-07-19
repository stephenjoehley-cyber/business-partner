const GENERIC_EMAIL_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'msn.com',
] as const;

/**
 * Recommendation 1, approved by Founder + CPO, 19 July 2026 — Executive
 * Honesty constraint from the CPO explicitly: "If all we genuinely know
 * is the email domain, then that's what we should present... Let's
 * avoid inferring company names or identities from that domain." This
 * returns the literal domain string (e.g. "mzansichat.co.za"), never a
 * guessed or capitalised company name — the value is grounded fact, not
 * an educated guess.
 *
 * Returns undefined for a non-email string (a real display name has
 * nothing to extract) or a generic consumer email provider (gmail.com
 * etc.), where a domain carries no genuine organisational signal.
 */
export function companyDomainHint(emailOrName: string): string | undefined {
  if (!emailOrName.includes('@')) return undefined;
  const domain = emailOrName.split('@')[1]?.toLowerCase().trim();
  if (!domain) return undefined;
  if ((GENERIC_EMAIL_PROVIDERS as readonly string[]).includes(domain)) return undefined;
  return domain;
}
