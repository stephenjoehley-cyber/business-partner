import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'Partner Programme',
  description: 'If you already work with business owners, become a Business Partner referral partner.',
  alternates: { canonical: '/partners' },
  openGraph: {
    title: 'Partner Programme',
    description: 'If you already work with business owners, become a Business Partner referral partner.',
    type: 'website',
    url: '/partners',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partner Programme',
    description: 'If you already work with business owners, become a Business Partner referral partner.',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Partner Programme',
  description: 'If you already work with business owners, become a Business Partner referral partner.',
  url: 'https://business-partner.co.za/partners',
};

/**
 * Partner Programme UX Integration, 23 July 2026 (Founder decision) —
 * the public front door to the Partner Capability closed earlier this
 * session. Deliberately not a self-service application/approval flow:
 * "Become a Partner" leads to a direct, personally-reviewed email, the
 * same reasoning already applied to the main Contact page. A self-
 * service registration workflow is its own capability, to be scoped
 * with its own Product Audit if application volume ever justifies it,
 * not assumed here.
 *
 * Written for a different audience than every other page on this
 * site: not a business owner deciding whether to use Business Partner,
 * but someone (a publisher, association, accountant, coach) who
 * already has a relationship with business owners and is deciding
 * whether to recommend it. Product Truth applies here exactly as
 * everywhere else: referral tracking, the portal, and revenue share
 * are all real and working; no specific earnings figures are claimed,
 * since none would be honest at this stage.
 *
 * Partner Launch Kit, 23 July 2026 (Founder decision) — a real,
 * standing operational commitment, not a technology feature: every
 * approved partner gets a website announcement, LinkedIn content, and
 * client email copy prepared by hand, through the same governed
 * editorial process as everything else, when they're approved. This
 * page now promises that explicitly, which means it must actually
 * happen the next time a real partner is approved — not an automation
 * claim, a service commitment.
 */
export default function PartnersPage() {
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
          Partner Programme
        </h1>

        <div className="mt-8 flex flex-col gap-6 text-lg text-ink-soft">
          <h2 className="font-editorial mt-2 text-2xl font-semibold text-ink">Why partner with us</h2>
          <p>
            You already know business owners who could use this. Whether you publish for them, advise
            them, or represent them, you&rsquo;re in a position to recommend something genuinely useful,
            not just another tool competing for their attention.
          </p>
          <p>
            A good recommendation strengthens the relationship you already have. This is one worth
            making.
          </p>

          <h2 className="font-editorial mt-4 text-2xl font-semibold text-ink">Benefits</h2>
          <ul className="flex flex-col gap-3">
            <li>Your own referral link, ready to share with your audience or clients.</li>
            <li>A real-time view of everyone who&rsquo;s signed up through it, and your revenue share.</li>
            <li>
              A professionally prepared Partner Launch Kit, including a website announcement,
              LinkedIn content, and client email copy, so you can introduce Business Partner
              properly from day one, not figure it out yourself.
            </li>
            <li>Nothing to manage. No dashboard to configure, no reports to compile yourself.</li>
          </ul>

          <h2 className="font-editorial mt-4 text-2xl font-semibold text-ink">How it works</h2>
          <ol className="flex flex-col gap-3">
            <li>1. Get in touch. We review every enquiry personally.</li>
            <li>2. We agree terms together, including your revenue share.</li>
            <li>3. You get your own referral link, a portal to track it, and your Launch Kit.</li>
            <li>4. Share it however suits you. Everything else is tracked automatically.</li>
          </ol>

          <div className="mt-6 rounded-lg border border-surface-border bg-surface-card p-8">
            <p className="text-ink">
              If you already work with business owners and think this is worth recommending, we&rsquo;d
              like to hear from you.
            </p>
            <a
              href="mailto:partners@business-partner.co.za"
              className="focus-ring mt-6 inline-block rounded-md bg-brass px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Become a Partner
            </a>
          </div>
        </div>

        <p className="mt-8 text-sm text-ink-faint">
          Have a general question instead?{' '}
          <Link href="/contact" className="font-medium text-ink underline underline-offset-2">
            Get in touch here
          </Link>
          .
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
