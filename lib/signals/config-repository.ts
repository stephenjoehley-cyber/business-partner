import { prisma } from '@/lib/prisma';
import type { SignalDomain } from './types';

/**
 * The only module that touches SignalProviderConfig persistence directly —
 * same pattern as lib/brain/repository.ts.
 */
export async function getConfiguredProviderId(
  businessId: string,
  domain: SignalDomain
): Promise<string | null> {
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
  return prisma.signalProviderConfig.upsert({
    where: { businessId_domain: { businessId, domain } },
    update: { providerId },
    create: { businessId, domain, providerId },
  });
}
