import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { getPublishedValue, getAllPublishedInDomain } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const value = await getPublishedValue('blog', params.slug);
  if (!isBlogPostValue(value)) {
    return { title: 'Insights' };
  }
  return {
    title: value.title,
    description: value.excerpt || value.title,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: value.title,
      description: value.excerpt || value.title,
      type: 'article',
      url: `/blog/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: value.title,
      description: value.excerpt || value.title,
    },
  };
}

/**
 * Rendering founder-authored content with dangerouslySetInnerHTML is
 * safe here specifically because only the founder-only /executive/blog
 * route can ever write a post's body — there is no path from an
 * untrusted customer input to this render. This would not be safe if
 * post content ever became customer- or third-party-submitted.
 */
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const value = await getPublishedValue('blog', params.slug);
  if (!isBlogPostValue(value)) {
    notFound();
  }

  const posts = await getAllPublishedInDomain('blog');
  const post = posts.find((p) => p.key === params.slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: value.title,
    description: value.excerpt || value.title,
    datePublished: post?.publishedAt?.toISOString(),
    author: { '@type': 'Organization', name: value.author ?? 'Business Partner' },
  };

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-[720px] px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-editorial text-[32px] font-semibold leading-tight text-ink md:text-[40px]">
          {value.title}
        </h1>
        {post?.publishedAt && (
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
            {value.author ?? 'Business Partner'} {'\u00b7'}{' '}
            {post.publishedAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        <div
          className="mt-8 flex flex-col gap-4 text-lg text-ink-soft [&_a]:text-ink [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: marked.parse(value.body, { async: false }) as string }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
