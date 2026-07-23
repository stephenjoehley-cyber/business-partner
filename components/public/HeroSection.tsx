import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Asset 023 — Customer Truth, Ideal Customer Profile & Market Position,
 * and the Founder/CPO's approved Done & Due narrative direction, 23 July
 * 2026. Copy is governed by Asset 023, not fixed — this replaces the
 * original "Start every day knowing what matters most" promise, which
 * expressed only the "focus" half of the product's actual emotional
 * sequence (Asset 023 §7 / Asset 024's own Experience Philosophy: relief
 * before focus). The visual treatment (typography, whitespace, the quiet
 * hexagon motif) is unchanged — this is a narrative update, not a
 * redesign.
 *
 * Revised twice after the first version shipped, each time for a
 * distinct, real reason — recorded here rather than left implicit:
 * 1. Product Truth: the first draft's "nothing you need to act on"
 *    described one possible daily outcome as if it were the guaranteed
 *    capability. The QuickWin is that reviewing and separating has
 *    already happened, regardless of what that review finds.
 * 2. Commercial Storytelling: the corrected version was accurate but
 *    described the product's internal process ("reviews," "shows
 *    you") rather than what changes for the owner. Rewritten
 *    benefit-first, anchored in the owner's own words from Asset 023
 *    §11 ("I'm worried I'll forget something important").
 * 3. No absolute claims: "you'll never have to wonder" was itself an
 *    unqualified guarantee — corrected to "confident," a feeling
 *    Asset 023 §5/§7/§9 all name directly, without claiming certainty
 *    the product can't fully back in every case.
 *
 * Deliberate mitigation of the standalone-ambiguity risk flagged in the
 * Website Narrative Alignment Review: the headline never appears without
 * its two explanatory lines directly beneath it in the rendered page —
 * the metadata description (app/layout.tsx) carries a fuller sentence
 * for contexts (search snippets, shared links) where the headline could
 * otherwise appear alone.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24 lg:py-28">
      {/* Quiet background motif — a single large, faint hexagon outline echoing the logo mark, never competing with the text. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-brass opacity-[0.06] md:h-[520px] md:w-[520px]"
      >
        <polygon
          points="200,10 366,105 366,295 200,390 34,295 34,105"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        />
      </svg>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex max-w-[720px] flex-col gap-6">
          <p className="text-sm font-medium text-brass-deep">Business Partner</p>

          <h1 className="font-editorial max-w-[720px] text-[40px] font-semibold leading-[1.1] text-ink md:text-[56px] lg:text-[64px]">
            See what&rsquo;s done. Focus on what matters.
          </h1>

          <div className="flex max-w-[560px] flex-col gap-3 text-lg text-ink-soft">
            <p>Start your day confident you haven&rsquo;t missed what matters.</p>
            <p>
              When something genuinely needs you, you&rsquo;ll know exactly why — and exactly what
              to do next.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={PUBLIC_ROUTES.getStarted}
              className="focus-ring inline-block rounded-md bg-brass px-6 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href={PUBLIC_ROUTES.signIn}
              className="focus-ring inline-block rounded-md border border-surface-border px-6 py-3 text-center text-sm font-medium text-ink hover:border-ink-faint"
            >
              Sign in
            </Link>
          </div>

          <p className="text-sm text-ink-faint">
            Built for business owners who need clarity before the day takes over.
          </p>
        </div>
      </div>
    </section>
  );
}
