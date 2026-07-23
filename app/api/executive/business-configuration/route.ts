import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proposeCapability, getPendingCapabilities, getPublishedValue } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

/**
 * Governed Capability Framework, Business Configuration domain — 23
 * July 2026. Founder-only (enforced in middleware.ts for every
 * /api/executive/* route); this handler still checks auth itself,
 * matching this codebase's established pattern of every route
 * verifying its own caller rather than relying solely on middleware.
 */

const BUSINESS_CONFIGURATION_KEYS = ['business_name', 'company_description', 'support_email', 'website_url', 'contact_information'] as const;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [pending, published] = await Promise.all([
    getPendingCapabilities('business_configuration'),
    Promise.all(BUSINESS_CONFIGURATION_KEYS.map(async (key) => ({ key, value: await getPublishedValue('business_configuration', key) }))),
  ]);

  return NextResponse.json({ pending, published });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!BUSINESS_CONFIGURATION_KEYS.includes(key)) {
    return NextResponse.json({ error: `Unrecognised business_configuration key: ${key}` }, { status: 400 });
  }
  if (typeof value !== 'string' || !value.trim()) {
    return NextResponse.json({ error: 'A non-empty value is required' }, { status: 400 });
  }

  const proposal = await proposeCapability('business_configuration', key, value.trim(), user.id);
  return NextResponse.json({ proposal });
}
