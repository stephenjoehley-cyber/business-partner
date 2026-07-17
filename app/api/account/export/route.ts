import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { getAllMorningBriefsForBusiness } from '@/lib/cognition/repository';
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
 * Data export (Decision Backlog Q11, Operating Model §4 — the business
 * owner owns their data, Business Partner is a processor of it).
 *
 * Deliberately excludes SignalProviderConfig's encrypted OAuth tokens —
 * those are Business Partner's own integration secrets, not the owner's
 * business data in the sense this export exists to satisfy, and exporting
 * them (even encrypted) serves no legitimate purpose for the owner while
 * adding real risk if the file were ever mishandled.
 */
export async function GET() {
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

  const [signals, briefs] = await Promise.all([
    getSignalsForBusiness(business.id),
    getAllMorningBriefsForBusiness(business.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    business: {
      name: business.name,
      industry: business.industry,
      description: business.description,
      website: business.website,
      createdAt: business.createdAt,
    },
    goals: business.goals.map((goal: { description: string; priority: number; createdAt: Date }) => ({
      description: goal.description,
      priority: goal.priority,
      createdAt: goal.createdAt,
    })),
    people: business.people.map(
      (person: { name: string; relationship: string; email: string | null; notes: string | null }) => ({
        name: person.name,
        relationship: person.relationship,
        email: person.email,
        notes: person.notes,
      })
    ),
    signals,
    morningBriefs: briefs,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="business-partner-export-${business.id}.json"`,
    },
  });
}
