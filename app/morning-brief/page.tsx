import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsByIds, getSignalsForBusiness } from '@/lib/signals/repository';
import { getLatestMorningBrief } from '@/lib/cognition/repository';
import { getConfiguredProviderId } from '@/lib/signals/config-repository';
import { generateNarrative } from '@/lib/narrative/generate';
import { buildNarrativeInput } from '@/lib/narrative/fromMorningBrief';
import { greetingForTime, isSameDay } from '@/lib/ui/time';
import { isDemoMode } from '@/lib/demo/config';
import { ensureDemoSeeded } from '@/lib/demo/seed';
import { AppShell } from '@/components/foundation/AppShell';
import { AccountBlock } from '@/components/foundation/AccountBlock';
import { RecommendationTrigger } from './RecommendationTrigger';
import { MorningBriefCard } from './MorningBriefCard';
import { AllClearCard } from './AllClearCard';
import { BusinessMemoryReflection } from './BusinessMemoryReflection';
import { DemoModeBadge, DemoModeBanner } from './DemoModeBanner';

/**
 * Found live, 19 July 2026: this page had never been marked dynamic,
 * unlike every API route (see DECISIONS.md, 17 July 2026, the
 * build-time static-export failure). Settings appeared to update
 * correctly after adding a Goal/Person only because those specific
 * updates render via client-side state, not a server re-fetch — this
 * page has no such workaround, and a real MorningBrief update (a new
 * continuityNote, a newly-generated recommendation) could be served
 * stale from a cached render indefinitely, surviving both a browser
 * refresh and an incognito window, since the staleness lives on the
 * server, not the browser.
 */
export const dynamic = 'force-dynamic';

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

  // Greeting priority: Preferred Name (captured at signup, stored in
  // Supabase user_metadata — no schema change) falls back to the business
  // name for any account that signed up before this existed, including
  // Demo Mode's stubbed user. Founder + CPO decision, 2026-07-15: Business
  // Partner should greet the person, not the business (Constitution,
  // Executive Presence Specification).
  const preferredName =
    typeof user.user_metadata?.preferredName === 'string' && user.user_metadata.preferredName.trim()
      ? user.user_metadata.preferredName.trim()
      : undefined;
  const greetingName = preferredName ?? business.name;

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

  // Only computed when actually needed (the all_clear tier, real accounts
  // only) — determines which closing sentence BusinessMemoryReflection
  // shows. Demo Mode never reaches the all_clear tier, so this is never
  // evaluated for it.
  const calendarConnected =
    latestBrief?.tier === 'all_clear' &&
    !demoMode &&
    (await getConfiguredProviderId(business.id, 'calendar')) === 'google-calendar';

  return (
    <AppShell
      accountSlot={
        demoMode ? (
          <DemoModeBadge />
        ) : (
          <AccountBlock name={greetingName} businessName={business.name} />
        )
      }
    >
      <div className="mx-auto max-w-2xl">
        {demoMode && <DemoModeBanner />}

        {/*
          2026-07-18 (D1.1): the standalone header (wordmark label,
          Settings link, SignOutButton) is removed — AppShell's persistent
          Nav and AccountBlock now cover both, consistently, on every page
          it wraps, rather than one hand-maintained link per page. The
          greeting itself stays as real page content, not chrome, and now
          takes the editorial headline role Asset 021 §5.1 names
          explicitly for Morning Brief headlines.
        */}
        <h1 className="text-editorial-headline mb-12">
          {greetingForTime()}, {greetingName}.
        </h1>

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
        <>
          <BusinessMemoryReflection
            businessName={business.name}
            industry={business.industry}
            goals={business.goals}
            people={business.people}
            calendarConnected={calendarConnected}
          />
          <AllClearCard
            message={latestBrief.message}
            generatedAt={latestBrief.generatedAt}
            todaysAgenda={todaysAgenda}
          />
        </>
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
          continuityNote={latestBrief.continuityNote}
        />
      )}
      </div>
    </AppShell>
  );
}
