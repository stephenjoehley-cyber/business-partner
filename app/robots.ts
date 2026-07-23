import type { MetadataRoute } from 'next';

/**
 * Investor Readiness Sprint 001, P0.2 — found during the production QA
 * sweep: no robots.txt existed at all. Authenticated pages already carry
 * their own `noindex, nofollow` (see app/(auth)/login/page.tsx and
 * siblings), so this only needs to state the obvious default rather than
 * duplicate per-page directives.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
  };
}
