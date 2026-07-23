import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { getAllPublishedInDomain } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Updates and thinking from Business Partner.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog',
    description: 'Updates and thinking from Business Partner.',
    type: 'website',
    url: '/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog',
    description: 'Updates and thinking from Business Partner.',
  },
};

interface BlogPostValue {
  title: string;
  excerpt: string;
  body: string;
}

function isBlogPostValue(value: unknown): value is BlogPostValue {
  return !!value && typeof value === 'object' && 'title' in value;
}

/**
 * Executive Operating Dashboard, Growth domain — 23 July 2026. Reads
 * directly from the Governed Capability Framework's published rows for
 * domain 'blog' — no separate content store, this listing is exactly
 * what /executive/blog has published, nothing more.
 */
export default async function BlogIndexPage() {
  const posts = await getAllPublishedInDomain('blog');

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
          Blog
        </h1>

        {posts.length === 0 ? (
          <p className="mt-6 text-lg text-ink-soft">Nothing published yet. Check back soon.</p>
        ) : (
          <div className="mt-10 flex flex-col gap-8">
            {posts.map((post) => {
              const value = isBlogPostValue(post.value) ? post.value : undefined;
              if (!value) return null;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.key}`}
                  className="focus-ring block rounded-lg border border-surface-border p-6 hover:border-ink-faint"
                >
                  <h2 className="text-xl font-semibold text-ink">{value.title}</h2>
                  {value.excerpt && <p className="mt-2 text-ink-soft">{value.excerpt}</p>}
                  {post.publishedAt && (
                    <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
                      {post.publishedAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
