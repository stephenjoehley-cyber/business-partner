import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'About — Business Partner',
  description: 'Why Business Partner exists, and the kind of company we\u2019re building.',
};

/**
 * Asset 023 -> Product Vision (Asset 002) -> Product Truth -> narrative,
 * the same process established for the homepage, applied here for the
 * first time to a second page. Founder/CPO refinement, 23 July 2026: the
 * homepage's job is recognition; this page's job is conviction — it
 * earns more room than the homepage does, and is allowed to speak about
 * belief and long-term ambition, provided it is always clearly
 * distinguished from what the product does today (Product Truth).
 *
 * Two registers are kept deliberately separate throughout: belief/
 * direction (legitimate on an About page, drawn from Asset 002's mission
 * language) and capability claims (must match today's actual product
 * exactly, never a different or looser claim than the homepage makes).
 */
export default function AboutPage() {
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
          Why Business Partner exists
        </h1>

        <div className="mt-8 flex flex-col gap-6 text-lg text-ink-soft">
          <p>
            Every entrepreneur deserves the kind of support large companies take for granted —
            someone who understands the business, keeps track of what&rsquo;s happening, and helps
            decide what matters most. Most small business owners can&rsquo;t hire that. We believe
            they shouldn&rsquo;t have to.
          </p>

          <p>
            Running a small business means wearing every hat. You&rsquo;re the salesperson, the
            bookkeeper, the person who calms an anxious customer and the one who has to work out
            cash flow late at night. Every decision, big or small, eventually lands on your desk,
            because there&rsquo;s rarely anyone else to hand it to.
          </p>

          <p>
            Success doesn&rsquo;t relieve that pressure. It usually makes it worse. More customers
            means more to track. More staff means more to coordinate. More momentum means more
            decisions arriving faster than you can make them well. At some point, the real
            constraint on a growing business stops being effort, or ambition, or even money. It
            becomes the sheer number of things one person can hold in their head at once.
          </p>

          <p>
            We think that&rsquo;s a real problem worth taking seriously — not a productivity
            inconvenience, but the actual ceiling on how well a business can be run.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            Why this company exists
          </h2>

          <p>
            We didn&rsquo;t set out to build another piece of software. Software that asks for more
            of an owner&rsquo;s attention is solving the wrong problem — attention is exactly what&rsquo;s
            already in short supply.
          </p>

          <p>
            We believe the right measure of a company like this isn&rsquo;t how much it does, but how
            much less an owner has to carry because of it. That belief shapes how we build: slowly
            enough to get things right, honestly enough to say when something isn&rsquo;t ready yet,
            and always in service of one person&rsquo;s actual day, not a feature list. We&rsquo;d
            rather build a small number of things that genuinely earn their place than a large
            number of things that merely exist.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            What Business Partner does today
          </h2>

          <p>
            Business Partner watches what you choose to connect, shows you what&rsquo;s already been
            considered, and brings forward only what genuinely needs your judgement — with the
            reasoning, not just the alert.
          </p>

          <h2 className="font-editorial mt-4 text-[24px] font-semibold text-ink">
            Where this is going
          </h2>

          <p>
            We&rsquo;re building toward something bigger: a partner that understands a business more
            deeply over time, and can eventually take on more of the work itself — always with
            your authority, never without it. Today, that means judgement. Over time, it will mean
            more.
          </p>

          <p>
            That&rsquo;s a deliberate sequence, not an accident of timing. Judgement has to be
            trustworthy before action can be — a partner who acts before they&rsquo;ve earned your
            confidence isn&rsquo;t actually helping. So we&rsquo;re building in that order: understand
            first, then advise, and only once that&rsquo;s proven itself, take on more of the doing.
            Today, Business Partner&rsquo;s job is to make sure you never carry more than you have
            to, alone. What it does next will always be something you&rsquo;ve asked for, not
            something it assumed.
          </p>

          <p className="text-ink">
            This isn&rsquo;t another piece of software to manage. It&rsquo;s meant to be the thing that
            means you have less to manage.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
