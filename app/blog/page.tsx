import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { getAllPublishedInDomain } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Product Updates',
  description: 'What\u2019s changed in Business Partner, and why it helps you.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Product Updates',
    description: 'What\u2019s changed in Business Partner, and why it helps you.',
    type: 'website',
    url: '/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Product Updates',
    description: 'What\u2019s changed in Business Partner, and why it helps you.',
  },
};

interface BlogPostValue {
  title: string;
  excerpt: string;
  body: string;
  postType?: 'update' | 'essay';
  author?: string;
}

function isBlogPostValue(value: unknown): value is BlogPostValue {
  return !!value && typeof value === 'object' && 'title' in value;
}

/**
 * Executive Operating Dashboard, Growth domain — 23 July 2026. Reads
 * directly from the Governed Capability Framework's published rows for
 * domain 'blog' — no separate content store, this listing is exactly
 * what /executive/blog has published, nothing more.
 *
 * Split into Product Updates and Essays, 23 July 2026 — found live:
 * terse changelog entries and longer-form essays were mixed together
 * with no way to tell them apart, once real content of both kinds
 * existed. Posts published before this distinction default to Essay
 * (the safer assumption for existing content), correctable via the
 * management panel's Edit function.
 */
function PostCard({ post, value }: { post: { id: string; key: string; publishedAt: Date | null }; value: BlogPostValue }) {
  return (
    <Link
      href={`/blog/${post.key}`}
      className="focus-ring block rounded-lg border border-surface-border p-6 hover:border-ink-faint"
    >
      <h2 className="text-xl font-semibold text-ink">{value.title}</h2>
      {value.excerpt && <p className="mt-2 text-ink-soft">{value.excerpt}</p>}
      <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
        {value.author ?? 'Business Partner'}
        {post.publishedAt &&
          ` \u00b7 ${post.publishedAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}`}
      </p>
    </Link>
  );
}

export default async function BlogIndexPage() {
  const posts = await getAllPublishedInDomain('blog');
  const withValues = posts
    .map((post) => ({ post, value: isBlogPostValue(post.value) ? post.value : undefined }))
    .filter((p): p is { post: typeof posts[number]; value: BlogPostValue } => !!p.value);

  const updates = withValues.filter((p) => p.value.postType === 'update');
  const essays = withValues.filter((p) => p.value.postType !== 'update');

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-[720px] px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-editorial text-[32px] font-semibold leading-tight text-ink md:text-[40px]">
          Product Updates
        </h1>

        {withValues.length === 0 ? (
          <p className="mt-6 text-lg text-ink-soft">Nothing published yet. Check back soon.</p>
        ) : (
          <>
            {updates.length > 0 && (
              <div className="mt-10 flex flex-col gap-8">
                {updates.map(({ post, value }) => (
                  <PostCard key={post.id} post={post} value={value} />
                ))}
              </div>
            )}

            {essays.length > 0 && (
              <div className={updates.length > 0 ? 'mt-16' : 'mt-10'}>
                <h2 className="font-editorial text-2xl font-semibold text-ink">Essays</h2>
                <div className="mt-6 flex flex-col gap-8">
                  {essays.map(({ post, value }) => (
                    <PostCard key={post.id} post={post} value={value} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
