/** Contract §12 — restrained, high-contrast, but not a promotional banner. */
export function DifferenceSection() {
  return (
    <section className="bg-ink px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[760px] text-center">
        <h2 className="font-editorial text-[30px] font-semibold leading-tight text-surface md:text-[38px]">
          Not another dashboard to manage.
        </h2>

        <p className="mt-6 text-lg text-surface/80">
          Most software waits for the owner to open it, search through it and decide what matters.
          Business Partner is designed to do the thinking first and present a considered view.
        </p>

        <p className="mt-6 text-base font-medium text-brass-soft">
          The aim is not more software activity. It is better executive attention.
        </p>
      </div>
    </section>
  );
}
