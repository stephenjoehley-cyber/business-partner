'use client';

/**
 * Root error boundary (Sprint 001 authenticated QA, 23 July 2026 —
 * found missing entirely, on any route, anywhere in the app). Without
 * this, an uncaught error on any page falls through to Next.js's raw
 * default error screen — exactly the kind of thing that would undercut
 * confidence in front of an investor, regardless of which page it
 * happened on.
 *
 * This is app/error.tsx, not global-error.tsx — it catches errors in
 * any page or nested layout below the root layout, which stays
 * mounted around it, so no <html>/<body> here. global-error.tsx is a
 * different, much rarer case (an error in the root layout itself) and
 * isn't needed for what this QA pass found.
 *
 * Deliberately the same calm, first-person voice already established
 * for the one place this exact situation was handled before (the
 * finance upload flow's unexpected-failure copy, lib/finance/copy.ts) —
 * reused here rather than inventing new tone for the same kind of
 * moment.
 */
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-ink">Something went wrong on my side, not yours.</h1>
        <p className="mt-2 text-sm text-ink-faint">
          Try again in a moment. If it keeps happening, let us know and we&apos;ll look into it.
        </p>
        <button
          onClick={reset}
          className="focus-ring mt-6 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
