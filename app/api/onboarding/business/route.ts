import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBusinessProfile, getBusinessByOwner, updateBusinessProfile } from '@/lib/brain/repository';
import { businessProfileSchema } from '@/lib/brain/validation';
import { resolveReferral } from '@/lib/executive/partnerReferral';

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

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = businessProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getBusinessByOwner(user.id);

  const business = existing
    ? await updateBusinessProfile(existing.id, parsed.data)
    : await createBusinessProfile(user.id, parsed.data);

  // Partner Capability, 23 July 2026 — only on genuine first-time
  // creation, matching PartnerReferral's own create-only, one-row-per-
  // business design. The referral code travelled here via Supabase's
  // own user_metadata, the same mechanism already proven for
  // preferredName, since no Business existed at signup time to attach
  // it to directly.
  if (!existing) {
    const referralCode = user.user_metadata?.referralCode as string | undefined;
    await resolveReferral(business.id, referralCode);
  }

  return NextResponse.json({ business });
}
