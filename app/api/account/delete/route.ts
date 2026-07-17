import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';

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
 * Business deletion (Decision Backlog Q11, Option A — approved 16 July
 * 2026). Deletes the Business row and everything cascaded from it (Goal,
 * Person, Signal, SignalProviderConfig, MorningBrief — all `onDelete:
 * Cascade` in schema.prisma). Deliberately does NOT delete the Supabase
 * Auth identity (email/login) — that would require introducing
 * SUPABASE_SERVICE_ROLE_KEY, a materially larger credential surface the
 * Founder decided against for v1. An owner who deletes can sign back in
 * and start a new business from a clean slate.
 *
 * A single `prisma.business.delete()` is already atomic — Postgres
 * executes the cascade as part of one DELETE statement, not a
 * multi-step operation that could partially fail.
 *
 * Notification (Founder decision, 16 July 2026): no email provider, no
 * new persistence, no admin surface — the event (and any optional
 * owner feedback) is logged as a single structured line, captured
 * automatically by Vercel's Runtime Logs. Deliberately shaped as a named
 * business event now, not a debug message, so it could feed a real
 * notification or analytics pipeline later without changing its shape —
 * but nothing beyond a console.log is built until deletion volume
 * actually makes that necessary.
 */
export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Not available in Demo Mode' }, { status: 403 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const business = await getBusinessByOwner(user.id);
  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  let feedback: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.feedback === 'string' && body.feedback.trim()) {
      feedback = body.feedback.trim().slice(0, 2000); // generous but bounded — this is a log line, not a database column
    }
  } catch {
    // No body, or not JSON — feedback is optional, so proceed without it.
  }

  console.log(
    JSON.stringify({
      event: 'BusinessDeleted',
      business: business.name,
      businessId: business.id,
      timestamp: new Date().toISOString(),
      ...(feedback ? { feedback } : {}),
    })
  );

  await prisma.business.delete({ where: { id: business.id } });

  return NextResponse.json({ success: true });
}
