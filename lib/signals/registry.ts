import type { BusinessContext, SignalProvider, TimeWindow } from '../signals/provider';
import type { DraftSignal, SignalDomain } from './types';
import { DEFAULT_PROVIDER_ID, availableDomains, getProvider } from './providers';
import { getConfiguredProviderId } from './config-repository';
import { isDemoMode } from '@/lib/demo/config';

/**
 * Resolves which provider is active for a business, per domain, and fetches
 * signals through it. This is the seam described in Blueprint §6: nothing
 * upstream of this class knows or cares whether a domain is backed by a
 * seeded provider or a live integration.
 *
 * Production Truthfulness Correction (2026-07-14): a real (non-Demo-Mode)
 * business with no explicitly configured provider for a domain no longer
 * falls back to a seeded provider — that would mean a real account seeing
 * fabricated meetings or emails with no live integration behind them,
 * which is no longer acceptable per Executive Honesty. Demo Mode is
 * unaffected: it has no UI to configure a provider override in the first
 * place, and is expected to always show synthetic data, clearly labelled
 * as such elsewhere in the UI. A real business simply gets nothing for
 * that domain — the Cognitive Engine already handles "no signals"
 * correctly and truthfully via the existing all_clear tier.
 */
export class SignalProviderRegistry {
  async getActiveProvider(businessId: string, domain: SignalDomain): Promise<SignalProvider | null> {
    const configuredId = await getConfiguredProviderId(businessId, domain);
    if (configuredId) {
      return getProvider(configuredId);
    }

    if (isDemoMode()) {
      const defaultId = DEFAULT_PROVIDER_ID[domain];
      if (!defaultId) {
        throw new Error(`No default provider for domain: ${domain}`);
      }
      return getProvider(defaultId);
    }

    // Real account, nothing configured for this domain: truthful "not
    // connected" — no provider, no signals, no invention.
    return null;
  }

  async fetchAllSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const domains = availableDomains();
    const providers = await Promise.all(domains.map((d) => this.getActiveProvider(context.business.id, d)));

    const activeProviders = providers.filter((p): p is SignalProvider => p !== null);
    const results = await Promise.all(activeProviders.map((provider) => provider.fetchSignals(context, window)));

    return results.flat();
  }
}
