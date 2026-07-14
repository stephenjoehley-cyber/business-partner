import { prisma } from '@/lib/prisma';
import type { SignalDomain } from './types';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoConfiguredProviderId } from '@/lib/demo/store';

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
    return;
  }

  return prisma.signalProviderConfig.upsert({
    where: { businessId_domain: { businessId, domain } },
    update: { providerId },
    create: { businessId, domain, providerId },
  });
}

export async function getProviderConfigData(
  businessId: string,
  domain: SignalDomain
): Promise<Record<string, unknown> | null> {
  if (isDemoMode()) return null;

  const config = await prisma.signalProviderConfig.findUnique({
    where: { businessId_domain: { businessId, domain } },
  });
  return (config?.config as Record<string, unknown> | null) ?? null;
}

export async function setProviderConfigData(
  businessId: string,
  domain: SignalDomain,
  providerId: string,
  configData: Record<string, unknown>
) {
  if (isDemoMode()) return;

  return prisma.signalProviderConfig.upsert({
    where: { businessId_domain: { businessId, domain } },
    update: { providerId, config: configData },
    create: { businessId, domain, providerId, config: configData },
  });
}

export async function deleteProviderConfig(businessId: string, domain: SignalDomain): Promise<void> {
  if (isDemoMode()) return;

  await prisma.signalProviderConfig.deleteMany({
    where: { businessId, domain },
  });
}
