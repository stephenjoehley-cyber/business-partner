const CAPABILITIES = [
  {
    label: 'Understand',
    title: 'Understands the business in context',
    body: 'Your priorities, relationships and goals provide the context for what matters.',
  },
  {
    label: 'Prioritise',
    title: 'Separates attention from noise',
    body: 'Not everything happening in the business deserves equal weight.',
  },
  {
    label: 'Recommend',
    title: 'Suggests what to do next',
    body: 'A recommendation should lead to a practical decision, not another dashboard to interpret.',
  },
] as const;

/** Contract §10 — three concise items with restrained numbered labels, not generic feature cards. */
export function ProductRoleSection() {
  return (
    <section className="border-t border-surface-border bg-surface-card px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-editorial max-w-[620px] text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          Judgement before more information.
        </h2>

        <p className="mt-6 max-w-[620px] text-lg text-ink-soft">
          Business Partner considers what is happening across the information you choose to
          connect and helps bring the most important matters to the surface.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {CAPABILITIES.map((item, index) => (
            <div key={item.label} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-brass-deep">
                {String(index + 1).padStart(2, '0')} · {item.label}
              </p>
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-faint">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
