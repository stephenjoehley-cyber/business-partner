import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/** Contract §14 — a calm invitation, not a conversion banner. */
export function FinalInvitation() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-[620px] flex-col items-center gap-6 text-center">
        <h2 className="font-editorial text-[30px] font-semibold leading-tight text-ink md:text-[38px]">
          Begin with a clearer view of your business.
        </h2>

        <p className="text-lg text-ink-soft">
          Create your account, tell Business Partner what matters and take the first step toward a
          more prepared working day.
        </p>

        <Link
          href={PUBLIC_ROUTES.getStarted}
          className="focus-ring inline-block rounded-md bg-brass px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Get started
        </Link>

        <p className="text-sm text-ink-faint">
          Already have an account?{' '}
          <Link href={PUBLIC_ROUTES.signIn} className="font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
