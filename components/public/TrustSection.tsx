const PRINCIPLES = ['No hidden certainty.', 'No invented capability.', 'No action taken without the authority to do so.'] as const;

/**
 * Contract §13. The control statement ("Connections can be reviewed in
 * Settings. Business data can be exported or removed by the owner.") was
 * checked against production before use: Settings genuinely has a
 * Connections section (Calendar, Gmail) and genuine export/delete
 * actions (app/api/account/export, app/api/account/delete) — both true,
 * no adjustment needed. No security-certification language is used,
 * since none is independently verified or formally approved.
 */
export function TrustSection() {
  return (
    <section className="border-t border-surface-border px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[760px]">
        <h2 className="font-editorial text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          Your business remains yours.
        </h2>

        <p className="mt-6 text-lg text-ink-soft">
          You decide what information to provide and which connections to use. Business Partner
          should always be clear about what it knows, what it does not know and why it has reached
          a view.
        </p>

        <p className="mt-4 text-lg text-ink-soft">
          Connections can be reviewed in Settings. Business data can be exported or removed by the
          owner.
        </p>

        <ul className="mt-8 flex flex-col gap-2">
          {PRINCIPLES.map((principle) => (
            <li key={principle} className="text-sm text-ink-faint">
              {principle}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
