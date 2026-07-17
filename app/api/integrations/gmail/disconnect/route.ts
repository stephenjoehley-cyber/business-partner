import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getProviderConfigData, deleteProviderConfig } from '@/lib/signals/config-repository';
import { decryptToken } from '@/lib/signals/providers/google/tokenStorage';
import { revokeGoogleToken } from '@/lib/signals/providers/google/oauth';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time — see the identical
 * comment and the real build failure this fixed, DECISIONS.md,
 * 17 July 2026.
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const business = await getBusinessByOwner(user.id);
  if (!business) {
    return NextResponse.json({ error: 'Complete your business profile first' }, { status: 409 });
  }

  const stored = (await getProviderConfigData(business.id, 'email')) as
    | { encryptedAccessToken?: string }
    | null;

  if (stored?.encryptedAccessToken) {
    try {
      const accessToken = decryptToken(stored.encryptedAccessToken);
      const result = await revokeGoogleToken(accessToken);
      if (!result.success) {
        console.error(`Gmail revocation failed for business ${business.id}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Gmail revocation error for business ${business.id}:`, error);
    }
  }

  await deleteProviderConfig(business.id, 'email');

  return NextResponse.json({ success: true });
}
