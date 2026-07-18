/**
 * Supabase's own error messages are technically accurate but not written
 * in Business Partner's voice (Asset 017; Contract §19.2 — "avoid raw
 * provider messages"). This maps the specific, known cases to calm,
 * human phrasing, with a safe generic fallback for anything unmapped —
 * not a blanket replacement, since collapsing every error into one
 * message would hide real, useful distinctions (wrong password vs.
 * unconfirmed email are different problems with different next steps).
 */
export function humanizeAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return "We couldn't sign you in with those details. Check your email and password and try again.";
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in — check your inbox for the confirmation link.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Your password needs to be at least 8 characters.';
  }
  if (lower.includes('rate limit')) {
    return "That's a lot of attempts. Please wait a moment before trying again.";
  }

  return 'Something went wrong. Please try again in a moment.';
}
