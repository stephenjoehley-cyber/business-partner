/**
 * Shared destinations for the public entry experience (D1.2) — avoids
 * hardcoded route strings duplicated across PublicHeader, HeroSection,
 * and FinalInvitation, and makes them testable without render
 * infrastructure this repository doesn't have.
 */
export const PUBLIC_ROUTES = {
  home: '/',
  signIn: '/login',
  getStarted: '/signup',
} as const;
