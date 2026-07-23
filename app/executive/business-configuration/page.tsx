import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendingCapabilities, getPublishedValue } from '@/lib/executive/governedCapability';
import { BusinessConfigurationPanel } from './BusinessConfigurationPanel';

export const dynamic = 'force-dynamic';

const BUSINESS_CONFIGURATION_KEYS = [
  { key: 'business_name', label: 'Business name' },
  { key: 'company_description', label: 'Company description' },
  { key: 'support_email', label: 'Support email' },
  { key: 'website_url', label: 'Website URL' },
  { key: 'contact_information', label: 'Contact information' },
] as const;

/**
 * Executive Operating Dashboard — Founder + CPO, 23 July 2026. Access
 * control is enforced in middleware.ts (founder-only); this page also
 * redirects defensively if somehow reached without a user, matching
 * this codebase's established "every route checks itself" discipline.
 *
 * Deliberately one screen, one domain (Business Configuration) — not a
 * dashboard shell built to anticipate every future executive domain's
 * navigation before a second domain exists.
 */
export default async function BusinessConfigurationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [pending, published] = await Promise.all([
    getPendingCapabilities('business_configuration'),
    Promise.all(
      BUSINESS_CONFIGURATION_KEYS.map(async (field) => ({
        ...field,
        value: (await getPublishedValue('business_configuration', field.key)) as string | undefined,
      }))
    ),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink">Business Configuration</h1>
      <p className="mt-2 text-ink-faint">
        Values published here become the single source of truth wherever they are used across the
        platform.
      </p>
      <BusinessConfigurationPanel fields={published} pending={pending} />
    </main>
  );
}
