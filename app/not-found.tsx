import Link from 'next/link';

/**
 * Custom 404 (Sprint 001 authenticated QA, 23 July 2026 — found
 * missing). Next.js's default 404 page is unstyled and off-brand;
 * this is the kind of small gap that's easy to hit by accident
 * (an old bookmark, a typo) and reduces confidence disproportionately
 * to how minor the underlying issue actually is.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-ink">I couldn&apos;t find that page.</h1>
        <p className="mt-2 text-sm text-ink-faint">The link may be out of date, or the address may not be right.</p>
        <Link
          href="/"
          className="focus-ring mt-6 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
        >
          Back to Business Partner
        </Link>
      </div>
    </div>
  );
}
