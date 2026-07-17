import { NextResponse } from 'next/server';
import { getAllBusinessIds } from '@/lib/brain/repository';
import { runDailyCycleForBusiness } from '@/lib/orchestrator/dailyCycle';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time. Every route in
 * this app depends on request-specific state (session, cookies, query
 * params, or POST bodies), so none of them are ever safe to
 * statically prerender — added after a real production build failure
 * (2026-07-17): Next.js attempted to export the Google Calendar
 * callback route at build time, where GOOGLE_TOKEN_ENCRYPTION_KEY and
 * a real request context don't exist, and the build failed outright.
 * See DECISIONS.md.
 */
export const dynamic = 'force-dynamic';

/**
 * The scheduler-facing entry point for the Executive Orchestrator
 * (Increment 7). Deliberately thin: all judgement — idempotency, failure
 * isolation, what "running the daily cycle" actually means — lives in
 * `runDailyCycleForBusiness`, not here. This route's only job is to invoke
 * that function once per business that exists. It behaves identically
 * whether triggered by Vercel Cron, a manual curl for diagnosis, or a
 * future different scheduler — because it does nothing scheduler-specific
 * itself.
 *
 * Authenticated by a shared secret (`CRON_SECRET`), never by a Supabase
 * user session — a scheduled job has no user. This is a different trust
 * boundary from every other route in the application, which is why it
 * cannot simply reuse the existing manual `/api/recommendations/generate`
 * route's auth.
 *
 * Runs sequentially, not in parallel — v1 has no scale requirement that
 * would justify the added complexity, and sequential execution is simpler
 * to reason about and log. One business's failure (caught inside
 * `runDailyCycleForBusiness`) never prevents the next business's cycle
 * from running.
 *
 * The summary returned here is for internal diagnosis only — never
 * surfaced to any owner, consistent with how integration health is
 * handled everywhere else in the product (Asset 016, Asset 017).
 *
 * GET, not POST: Vercel Cron invokes scheduled routes via GET, and
 * automatically attaches `Authorization: Bearer $CRON_SECRET` when that
 * environment variable is set — matching `vercel.json`'s cron entry for
 * this path.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessIds = await getAllBusinessIds();

  let ranCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const businessId of businessIds) {
    const outcome = await runDailyCycleForBusiness(businessId);
    if (outcome.error) {
      failedCount += 1;
    } else if (outcome.ran) {
      ranCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  return NextResponse.json({
    totalBusinesses: businessIds.length,
    ran: ranCount,
    skipped: skippedCount,
    failed: failedCount,
  });
}
