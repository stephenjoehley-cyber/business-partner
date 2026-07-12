import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { SignOutButton } from './SignOutButton';
import { SignalPreviewPanel } from './SignalPreviewPanel';

export default async function MorningBriefPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/onboarding');

  const signals = await getSignalsForBusiness(business.id);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Business Partner</p>
          <h1 className="text-xl font-semibold">{business.name}</h1>
        </div>
        <SignOutButton />
      </header>

      {/*
        Honest empty state (Constitution Principle 10 / Blueprint Section 9):
        no MorningBrief rows exist yet because the Executive Orchestrator and
        Cognitive Engine ship in Increments 4-6. This never fabricates a
        recommendation — it says plainly what's true.
      */}
      <div className="rounded-lg border border-surface-border bg-surface-card p-8">
        <span className="mb-4 inline-block h-2 w-2 rounded-full bg-brass" aria-hidden />
        <h2 className="text-lg font-semibold">I&apos;ve already started.</h2>
        <p className="mt-2 max-w-md text-ink-faint">
          Your business profile, goals, and key people are saved. Once your first executive cycle runs, your
          Morning Brief will appear here — one clear recommendation, prepared before you ask.
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-ink-faint">Goals</dt>
            <dd className="font-mono text-ink">{business.goals.length}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">People</dt>
            <dd className="font-mono text-ink">{business.people.length}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Industry</dt>
            <dd className="text-ink">{business.industry}</dd>
          </div>
        </dl>
      </div>

      {/*
        Increment 2 preview: the Signal Provider pipeline is wired and
        persisting, but the Cognitive Engine that reasons over these signals
        into one recommendation doesn't exist until Increment 4-6. Showing
        the raw signals here — rather than nothing — keeps this increment
        honestly demonstrable without pretending the Morning Brief is done.
      */}
      <section className="mt-8">
        <h3 className="font-mono text-xs uppercase tracking-wide text-ink-faint">Signals (preview)</h3>
        <SignalPreviewPanel />
        {signals.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">No signals yet — click &ldquo;Refresh signals&rdquo; above.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {signals.map((signal: (typeof signals)[number]) => (
              <li
                key={signal.id}
                className="rounded border border-surface-border bg-surface-card px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wide text-brass-deep">
                    {signal.domain}
                  </span>
                  <span className="text-xs text-ink-faint">{signal.occurredAt.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-ink">{signal.type.replaceAll('_', ' ')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
