import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { getAllMorningBriefsForBusiness } from '@/lib/cognition/repository';
import { isDemoMode } from '@/lib/demo/config';

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
