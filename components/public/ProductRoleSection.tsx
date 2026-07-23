const CAPABILITIES = [
  {
    label: 'See what\u2019s done',
    title: 'Nothing you need to act on',
    body: 'Business Partner quietly reviews what you\u2019ve connected and shows you what\u2019s already been considered.',
  },
  {
    label: 'Focus on what matters',
    title: 'A clear next step, not another dashboard',
    body: 'When something genuinely needs you, it\u2019s brought to the surface, with the reasoning already worked out.',
  },
  {
    label: 'Gets to know your business',
    title: 'Better judgement over time',
    body: 'The more Business Partner understands about your business, the more it can rule out on its own.',
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
 */
export function ProductRoleSection() {
  return (
    <section className="border-t border-surface-border bg-surface-card px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-editorial max-w-[620px] text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          Two things, every day.
        </h2>

        <p className="mt-6 max-w-[620px] text-lg text-ink-soft">
          Business Partner considers what is happening across the information you choose to
          connect and helps bring the most important matters to the surface.
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
