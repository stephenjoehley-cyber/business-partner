import type { SignalProvider } from '../provider';
import type { SignalDomain } from '../types';
import { SeededCalendarProvider } from './seeded/calendar';
import { SeededEmailProvider } from './seeded/email';
import { GoogleCalendarProvider } from './google/calendar';

const PROVIDERS: Record<string, SignalProvider> = {
  'seeded-calendar': new SeededCalendarProvider(),
  'seeded-email': new SeededEmailProvider(),
  'google-calendar': new GoogleCalendarProvider(),
};

export const DEFAULT_PROVIDER_ID: Partial<Record<SignalDomain, string>> = {
  calendar: 'seeded-calendar',
  email: 'seeded-email',
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
