import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Practical answers to common questions about Business Partner.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ',
    description: 'Practical answers to common questions about Business Partner.',
    type: 'website',
    url: '/faq',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ',
    description: 'Practical answers to common questions about Business Partner.',
  },
};

const FAQS = [
  {
    question: 'What does Business Partner actually do?',
    answer:
      'It reviews the information you connect (calendar, email, finance) and shows you what has already been considered alongside what genuinely needs your attention, with the reasoning behind it.',
  },
  {
    question: 'What information does it need access to?',
    answer:
      'Only what you choose to connect. Most owners start with calendar and email, and add finance information when they want it reflected too. Nothing is accessed until you authorise it.',
  },
  {
    question: 'Does it replace my accountant or bookkeeper?',
    answer:
      'No. Business Partner helps you see what deserves attention across your business. It does not provide accounting, tax, or legal advice, and is not a substitute for the professionals you already work with.',
  },
  {
    question: 'What happens if it gets something wrong?',
    answer:
      'Business Partner is built to say when it is uncertain rather than present a guess as fact. Every recommendation can be checked against the underlying information it came from, and nothing is acted on without your say.',
  },
  {
    question: 'Can I remove my data if I stop using it?',
    answer:
      'Yes. You can export everything Business Partner has recorded about your business, and permanently delete it, at any time from your account settings.',
  },
  {
    question: 'Do I need any technical skill to use it?',
    answer:
      'No. Connecting your calendar or email takes a couple of clicks, and everything after that is written in plain language, not technical terms.',
  },
];

/**
 * Structured data uses FAQPage schema specifically, since it is
 * genuinely appropriate here (Search Presence, 23 July 2026) — search
 * engines and AI systems can surface individual answers directly, which
 * only makes sense when the underlying content actually is a list of
 * question/answer pairs, as it is here.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

/**
 * Asset 023 -> Product Vision -> Product Truth -> narrative, same
 * process as every prior page. This page's job (Founder/CPO, 23 July
 * 2026): answer the remaining practical questions a prospective owner
 * would have.
 *
 * Deliberately no pricing question here. Pricing is Founder-gated
 * (Production SaaS Completion Plan, Track B) and not yet confirmed
 * publicly — including a pricing FAQ would mean either inventing a
 * figure or dodging the question, and neither is acceptable. A pricing
 * question belongs here once the Pricing page itself exists.
 */
export default function FaqPage() {
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
          Frequently asked questions
        </h1>

        <div className="mt-10 flex flex-col gap-8">
          {FAQS.map((item) => (
            <div key={item.question}>
              <h2 className="text-lg font-semibold text-ink">{item.question}</h2>
              <p className="mt-2 text-lg text-ink-soft">{item.answer}</p>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
