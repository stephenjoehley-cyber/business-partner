import type { SignalProvider } from '../provider';
import type { SignalDomain } from '../types';
import { SeededCalendarProvider } from './seeded/calendar';
import { SeededEmailProvider } from './seeded/email';

/**
 * Every known provider is registered here by ID. Adding a live provider
 * later means adding one entry — the Registry, Orchestrator, and Cognitive
 * Engine never need to change (Blueprint §6).
 */
const PROVIDERS: Record<string, SignalProvider> = {
  'seeded-calendar': new SeededCalendarProvider(),
  'seeded-email': new SeededEmailProvider(),
};

/** The provider used for a domain when no explicit config exists. */
export const DEFAULT_PROVIDER_ID: Partial<Record<SignalDomain, string>> = {
  calendar: 'seeded-calendar',
  email: 'seeded-email',
  // tasks / crm / finance / proposals seeded providers ship in Increment 3.
};

export function getProvider(providerId: string): SignalProvider {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown signal provider: ${providerId}`);
  }
  return provider;
}

export function availableDomains(): SignalDomain[] {
  return Object.keys(DEFAULT_PROVIDER_ID) as SignalDomain[];
}
