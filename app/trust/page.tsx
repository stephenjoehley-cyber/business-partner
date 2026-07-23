import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'Trust',
  description: 'How Business Partner handles your business information, and what control you keep over it.',
  alternates: { canonical: '/trust' },
  openGraph: {
    title: 'Trust',
    description: 'How Business Partner handles your business information, and what control you keep over it.',
    type: 'website',
    url: '/trust',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trust',
    description: 'How Business Partner handles your business information, and what control you keep over it.',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Trust',
  description: 'How Business Partner handles your business information, and what control you keep over it.',
  url: 'https://business-partner.co.za/trust',
};

/**
 * Asset 023 -> Product Vision -> Product Truth -> narrative, same
 * process as About and Contact. This page's job (Founder/CPO, 23 July
 * 2026): answer "can I trust you with my business?"
 *
 * Deliberately conservative on security-specific claims. Q26 (Trust,
 * Security & Governance Framework, Decision Backlog) is explicitly
 * deferred, not yet a finished governance document, and the existing
 * homepage TrustSection's own code comment already established the
 * discipline this page follows: no security-certification language,
 * since none is independently verified or formally approved. Every
 * claim below is checked against something genuinely true in the
 * product today (data export/delete, per-business data isolation,
 * reviewable/revocable connections), not aspirational architecture
 * language from internal planning documents.
 */
export default function TrustPage() {
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
          Your business remains yours
        </h1>

        <div className="mt-8 flex flex-col gap-6 text-lg text-ink-soft">
          <p>
            Business Partner asks to see parts of how your business runs: your calendar, your
            inbox, the invoices you choose to share. That is a real ask, and we do not treat it
            lightly.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            What you decide
          </h2>

          <p>
            You choose what to connect. Nothing is accessed until you authorise it, and every
            connection can be reviewed or removed at any time in your account settings.
          </p>

          <p>
            Your information belongs to your business alone. It is never used to train models for
            other customers, and it is never shared or sold.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            What Business Partner will tell you
          </h2>

          <p>
            Business Partner should always be clear about what it knows, what it does not know,
            and why it has reached a particular view. If it is not confident about something, it
            says so, rather than presenting a guess as a certainty.
          </p>

          <p>
            It never takes action on your behalf without your explicit authority. Judgement is
            offered; the decision is always yours.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            Your data, on your terms
          </h2>

          <p>
            You can export everything Business Partner has recorded about your business at any
            time. If you choose to leave, you can permanently remove that information as well.
            Your login is separate from your business data, so closing one does not require
            closing the other.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            Where we are still building
          </h2>

          <p>
            A fuller, formal security and governance framework is planned but not yet built. We
            would rather tell you honestly that this work is still ahead of us than make claims we
            cannot yet fully stand behind. As that work is completed, this page will be updated to
            reflect it.
          </p>

          <p className="text-ink">No hidden certainty. No invented capability. No action without your authority.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
