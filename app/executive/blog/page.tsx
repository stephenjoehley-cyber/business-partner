import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPendingCapabilities, getAllPublishedInDomain } from '@/lib/executive/governedCapability';
import { ExecutiveNav } from '@/components/foundation/ExecutiveNav';
import { BlogManagementPanel } from './BlogManagementPanel';

export const dynamic = 'force-dynamic';

/**
 * Executive Operating Dashboard, Growth domain — 23 July 2026. The
 * Product Audit named "Content publishing" as a placeholder under
 * Growth without committing to build it; this is that placeholder
 * filled by genuine, immediate need, not built ahead of one.
 *
 * Reuses the Governed Capability Framework directly (domain: 'blog',
 * key: slug) rather than a separate content-management system — the
 * concrete test of the framework's own "scales without redesign" claim.
 */
export default async function BlogManagementPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [pending, published] = await Promise.all([getPendingCapabilities('blog'), getAllPublishedInDomain('blog')]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <ExecutiveNav />
      <h1 className="text-2xl font-semibold text-ink">Blog</h1>
      <p className="mt-2 text-ink-faint">
        Propose a post, then approve and publish it here. Published posts appear on the public
        blog immediately.
      </p>
      <BlogManagementPanel pending={pending} published={published} />
    </main>
  );
}
