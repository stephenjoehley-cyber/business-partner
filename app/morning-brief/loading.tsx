/**
 * Route-level loading state for /morning-brief (Sprint 001 authenticated
 * QA, 23 July 2026 — found missing). This page does more async work than
 * any other server-rendered route (signal queries, brief lookup, and a
 * Narrative Layer LLM call), yet was the one route without a loading
 * state at all. Matches the same quiet, labelled pattern already
 * established for /settings — no indefinite spinner.
 *
 * Wording updated for Asset 024, 23 July 2026 — "Done & Due" language,
 * consistent with the page it precedes.
 */
export default function MorningBriefLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-ink-faint" role="status" aria-live="polite">
        Preparing today&apos;s Done &amp; Due…
      </p>
    </div>
  );
}
