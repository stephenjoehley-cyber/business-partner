import { prisma } from '@/lib/prisma';
import type { SignalDomain } from './types';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoConfiguredProviderId } from '@/lib/demo/store';

/**
 * The only module that touches SignalProviderConfig persistence directly —
 * same pattern as lib/brain/repository.ts.
 *
 * Increment 5 (Demo Mode): always resolves to "no override configured,"
 * which is exactly right — Demo Mode should always use the default seeded
 * Calendar/Email providers, never a per-business config row it never had
 * a UI to set in the first place.
 */
export async function getConfiguredProviderId(
  businessId: string,
  domain: SignalDomain
): Promise<string | null> {
  if (isDemoMode()) return getDemoConfiguredProviderId();

  const config = await prisma.signalProviderConfig.findUnique({
    where: { businessId_domain: { businessId, domain } },
  });
  return config?.providerId ?? null;
}

export async function setProviderForDomain(
  businessId: string,
  domain: SignalDomain,
  providerId: string
) {
  if (isDemoMode()) {
    // No-op: Demo Mode has no persisted provider configuration to change.
    // Not an error — there's simply nothing to do, the same way
    // `getConfiguredProviderId` above always resolves to "use the default."
    return;
  }

  return prisma.signalProviderConfig.upsert({
    where: { businessId_domain: { businessId, domain } },
    update: { providerId },
    create: { businessId, domain, providerId },
  });
}
