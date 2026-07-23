const STEPS = [
  {
    number: '1',
    title: 'Tell us about the business',
    body: 'Share the business, its priorities and what you are working toward.',
  },
  {
    number: '2',
    title: 'Connect the information you choose',
    body: 'Business Partner uses the information you authorise. Connections remain visible and manageable in Settings.',
  },
  {
    number: '3',
    title: 'Begin with Done & Due',
    body: 'Start the day already knowing what\u2019s handled, and what deserves your attention.',
  },
] as const;

/**
 * Contract §11. Verified against actual production behaviour before
 * implementation (§11.3): onboarding does collect business profile,
 * goals and people (app/onboarding/steps/); connections (Calendar,
 * Gmail) are genuinely managed in Settings, not fabricated; Morning
 * Brief genuinely is the landing experience after onboarding completes.
 * No copy adjustment was needed — the Contract's text already matches
 * repository truth.
 */
export function GettingStartedSection() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-editorial max-w-[620px] text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          It starts by learning what matters to your business.
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-brass-deep">{step.number}</p>
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
              <p className="text-sm text-ink-faint">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
