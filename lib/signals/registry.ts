import type { BusinessContext, SignalProvider, TimeWindow } from '../signals/provider';
import type { DraftSignal, SignalDomain } from './types';
import { DEFAULT_PROVIDER_ID, availableDomains, getProvider } from './providers';
import { getConfiguredProviderId } from './config-repository';

/**
 * Resolves which provider is active for a business, per domain, and fetches
 * signals through it. This is the seam described in Blueprint §6: nothing
 * upstream of this class knows or cares whether a domain is backed by a
 * seeded provider or a live integration.
 */
export class SignalProviderRegistry {
  async getActiveProvider(businessId: string, domain: SignalDomain): Promise<SignalProvider> {
    const configuredId = await getConfiguredProviderId(businessId, domain);
    const providerId = configuredId ?? DEFAULT_PROVIDER_ID[domain];

    if (!providerId) {
      throw new Error(`No provider configured or defaulted for domain: ${domain}`);
    }

    return getProvider(providerId);
  }

  async fetchAllSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const domains = availableDomains();
    const providers = await Promise.all(domains.map((d) => this.getActiveProvider(context.business.id, d)));

    const results = await Promise.all(providers.map((provider) => provider.fetchSignals(context, window)));

    return results.flat();
  }
}
