import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsByIds, getSignalsForBusiness } from '@/lib/signals/repository';
import { getLatestMorningBrief } from '@/lib/cognition/repository';
import { generateNarrative } from '@/lib/narrative/generate';
import { buildNarrativeInput } from '@/lib/narrative/fromMorningBrief';
import { greetingForTime, isSameDay } from '@/lib/ui/time';
import { isDemoMode } from '@/lib/demo/config';
import { ensureDemoSeeded } from '@/lib/demo/seed';
import { SignOutButton } from './SignOutButton';
import { RecommendationTrigger } from './RecommendationTrigger';
import { MorningBriefCard } from './MorningBriefCard';
import { AllClearCard } from './AllClearCard';
import { DemoModeBadge, DemoModeBanner } from './DemoModeBanner';

export default async function MorningBriefPage() {
  const demoMode = isDemoMode();
  if (demoMode) {
    // Business/Goals/People are seeded synchronously; Signals and the
    // first Morning Brief require actually running the real pipeline
    // once — see lib/demo/seed.ts. Idempotent and safe to call on every
    // request.
    await ensureDemoSeeded();
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/onboarding');

  const [signals, latestBrief] = await Promise.all([
    getSignalsForBusiness(business.id),
    getLatestMorningBrief(business.id),
  ]);

  const supportingSignals =
    latestBrief && latestBrief.tier !== 'all_clear'
      ? await getSignalsByIds(business.id, latestBrief.supportingSignalIds)
      : [];

  // The Narrative Layer is a pure communication pass over an
  // already-decided MorningBriefResult (DECISIONS.md, "The Cognitive
  // Engine decides. The LLM communicates.") — run at render time, not
  // baked into persistence, so an LLM outage never invalidates a stored
  // brief and a future prompt-contract improvement applies to it
  // automatically. It always resolves (falls back to the Cognitive
  // Engine's own deterministic strings on any failure), so there is no
  // additional empty/error state to handle here.
  const narrative =
    latestBrief && latestBrief.tier !== 'all_clear'
      ? await generateNarrative(buildNarrativeInput(latestBrief, supportingSignals))
      : null;

  const today = new Date();
  const todaysAgenda = signals.filter((signal) => signal.domain === 'calendar' && isSameDay(signal.occurredAt, today));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      {demoMode && <DemoModeBanner />}

      <header className="mb-12 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Business Partner</p>
          <h1 className="text-xl font-semibold">
            {greetingForTime()}, {business.name}.
          </h1>
        </div>
        {demoMode ? <DemoModeBadge /> : <SignOutButton />}
      </header>

      {!latestBrief && (
        /*
          Honest empty state (Constitution Principle 10 / Blueprint Section
          9): no MorningBrief exists yet because no cycle has run. This is
          distinct from the all_clear tier below — that's a real Cognitive
          Engine conclusion; this is simply "nothing has been asked yet."
          The only place `RecommendationTrigger` still appears (Increment
          6, decision C) — once a brief exists, of any tier, Business
          Partner is expected to have already been proactive rather than
          waiting to be manually run again.
        */
        <div className="rounded-lg border border-surface-border bg-surface-card p-8">
          <span className="mb-4 inline-block h-2 w-2 rounded-full bg-brass" aria-hidden />
          <h2 className="text-lg font-semibold">I&apos;ve already started.</h2>
          <p className="mt-2 max-w-md text-ink-faint">
            Your business profile, goals, and key people are saved. Let me pull together your first
            recommendation.
          </p>
          <div className="mt-6">
            <RecommendationTrigger />
          </div>
        </div>
      )}

      {latestBrief?.tier === 'all_clear' && (
        <AllClearCard message={latestBrief.message} generatedAt={latestBrief.generatedAt} todaysAgenda={todaysAgenda} />
      )}

      {latestBrief && latestBrief.tier !== 'all_clear' && narrative && (
        <MorningBriefCard
          tier={latestBrief.tier}
          headline={narrative.headline}
          whyItMatters={narrative.whyItMatters}
          actionText={narrative.actionText}
          confidence={latestBrief.confidence}
          generatedAt={latestBrief.generatedAt}
          supportingSignals={supportingSignals}
        />
      )}
    </main>
  );
}
