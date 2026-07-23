import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

export const metadata: Metadata = {
  title: 'Plans & Pricing',
  description: 'Business Partner\u2019s Founding Customer launch offer: R199 per month for life, down from our standard R399 per month, for a limited number of customers.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Plans & Pricing',
    description: 'Business Partner\u2019s Founding Customer launch offer: R199 per month for life, down from our standard R399 per month, for a limited number of customers.',
    type: 'website',
    url: '/pricing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plans & Pricing',
    description: 'Business Partner\u2019s Founding Customer launch offer: R199 per month for life, down from our standard R399 per month, for a limited number of customers.',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Business Partner: Founding Customer',
  description: 'Business Partner\u2019s Founding Customer launch offer: R199 per month for life, down from our standard R399 per month, for a limited number of customers.',
  offers: {
    '@type': 'Offer',
    price: '199',
    priceCurrency: 'ZAR',
    url: 'https://business-partner.co.za/pricing',
  },
};

/**
 * Asset 023 -> Product Vision -> Product Truth -> narrative, same
 * process as every prior page. Founder commercial decision, 23 July
 * 2026, revised the same day: the standard subscription price is
 * R399/month; the launch includes a limited Founding Customer offer of
 * R199/month for life for qualifying early customers. This page now
 * shows both deliberately — R399 struck through, R199 as the real
 * price — so the launch offer's value is legible, not just its
 * existence. The purpose is to communicate the value of the launch
 * offer, not to replace the long-term pricing model; R399 is real,
 * current, standard pricing that early customers are being offered
 * relief from, not a future hypothetical.
 *
 * No payment capability in this phase (Website Sprint, Phase 1) — the
 * call to action leads to the existing signup flow, not a payment
 * form. Designed so a payment step can be inserted later (Phase 2)
 * without this page's content needing to change.
 */
export default function PricingPage() {
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
          Plans &amp; Pricing
        </h1>

        <p className="mt-6 text-lg text-ink-soft">
          One plan. A limited launch offer for early customers.
        </p>

        <div className="mt-10 rounded-lg border border-surface-border bg-surface-card p-8">
          <p className="font-mono text-xs uppercase tracking-wide text-brass-deep">Founding Customer</p>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-lg text-ink-faint line-through">R399</span>
            <span className="text-[40px] font-semibold leading-none text-ink">
              R199<span className="text-lg font-normal text-ink-faint"> / month</span>
            </span>
          </p>
          <p className="mt-3 text-ink-soft">
            For life, locked in for as long as your subscription stays active. A limited number of
            Founding Customer places are available at this launch price. Once they&rsquo;re gone,
            new customers join at our standard price of R399 per month.
          </p>

          <ul className="mt-6 flex flex-col gap-3 text-ink-soft">
            <li>Calendar and email reviewed daily</li>
            <li>Finance information understood from what you upload</li>
            <li>Done &amp; Due, every day: what&rsquo;s already handled and what needs you</li>
            <li>Business Memory that understands your business better over time</li>
          </ul>

          <Link
            href={PUBLIC_ROUTES.getStarted}
            className="focus-ring mt-8 inline-block rounded-md bg-brass px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>

        <p className="mt-8 text-sm text-ink-faint">
          Questions about what&rsquo;s included?{' '}
          <Link href={PUBLIC_ROUTES.faq} className="font-medium text-ink underline underline-offset-2">
            Visit our FAQ
          </Link>{' '}
          or{' '}
          <Link href={PUBLIC_ROUTES.contact} className="font-medium text-ink underline underline-offset-2">
            get in touch
          </Link>
          .
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
