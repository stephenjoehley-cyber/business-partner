const CAPABILITIES = [
  {
    label: 'See what\u2019s done',
    title: 'One less thing to worry about',
    body: 'You can stop double-checking what\u2019s already been handled — whether today brings nothing at all, or several things that genuinely need you.',
  },
  {
    label: 'Focus on what matters',
    title: 'A clear next step, not another dashboard',
    body: 'You don\u2019t have to dig for what matters or work out why — that part\u2019s already done.',
  },
  {
    label: 'Gets to know your business',
    title: 'Quieter every month',
    body: 'The longer you use it, the less you\u2019ll need to explain — and the less noise you\u2019ll have to sort through yourself.',
  },
] as const;

/**
 * Asset 023 §14 (Positioning Truth), §17 (Language) — Website Narrative
 * Alignment Review, 23 July 2026: this section previously used
 * "Understand / Prioritise / Recommend" as its visible labels, the exact
 * names of three stages in the Cognitive Engine's internal pipeline.
 * Identified as the single most significant finding in the review —
 * customer-facing copy should never be describable by pointing at
 * internal architecture and reading the label straight off it.
 *
 * Restructured around the approved Done & Due narrative direction
 * (Founder + CPO, 23 July 2026) rather than simply relabelling the same
 * three architecture stages — the third item describes a real,
 * genuine capability (Confirmed Mapping Memory, Business Memory
 * generally) rather than being invented to fill a three-column grid;
 * Asset 023 §18 states this directly: "Understanding deepens over time.
 * Recommendations improve over time. Business Memory becomes richer
 * over time."
 *
 * Revised again, same day, for Commercial Storytelling and Product
 * Truth together (see HeroSection.tsx for the fuller history — this
 * section went through the identical two corrections): card copy
 * rewritten from mechanism ("reviews," "shows you," "rule out") to
 * owner benefit, and absolute claims ("you'll never have to...")
 * softened to describe the product's actual design ("you can stop...",
 * "you don't have to...") rather than an unqualified future guarantee.
 * The section intro paragraph updated to match, for consistency with
 * the cards directly beneath it.
 */
export function ProductRoleSection() {
  return (
    <section className="border-t border-surface-border bg-surface-card px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-editorial max-w-[620px] text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          Two things, every day.
        </h2>

        <p className="mt-6 max-w-[620px] text-lg text-ink-soft">
          Every day, some things genuinely need you, and some things don&rsquo;t. You shouldn&rsquo;t
          have to sort that out yourself.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <div key={item.label} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-brass-deep">{item.label}</p>
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-faint">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
