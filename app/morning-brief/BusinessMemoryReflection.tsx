interface GoalSummary {
  id: string;
  description: string;
  priority: number;
}

interface PersonSummary {
  id: string;
  name: string;
}

/** Lower `priority` value means higher priority (owner-ranked, per the Goal model's own comment) — extracted as its own function so this ordering is directly testable without rendering the component. */
export function sortGoalsByPriority(goals: GoalSummary[]): GoalSummary[] {
  return [...goals].sort((a, b) => a.priority - b.priority);
}

interface BusinessMemoryReflectionProps {
  businessName: string;
  industry: string;
  goals: GoalSummary[];
  people: PersonSummary[];
  /**
   * True once a real Google Calendar connection exists for this business.
   * Determines only which closing sentence is shown — the reflection
   * itself (business, industry, goals, people) is identical either way.
   */
  calendarConnected: boolean;
}

/**
 * Business Memory Reflection (Phase B, Item 8) — a deterministic reflection
 * of data the owner already provided at onboarding, shown alongside the
 * Morning Brief's honest `all_clear` state.
 *
 * Deliberately outside the Cognitive Engine / Narrative Layer entirely:
 * nothing here is tiered, scored, or reasoned about. It exists because an
 * honest `all_clear` state, on its own, proves the *absence* of a
 * recommendation but says nothing about the *presence* of memory — and an
 * owner who just finished onboarding has no other evidence yet that
 * Business Partner was paying attention (Founder Experience Review,
 * 16 July 2026: "I gave it an industry, goals, people — none of that
 * shows up anywhere on this page.").
 *
 * Owns the "why Calendar matters" explanation and, when not yet connected,
 * the connect action itself — `AllClearCard`'s own message is unchanged
 * and still renders alongside this, since the two are different claims
 * (memory vs. the Cognitive Engine's honest tier statement).
 */
export function BusinessMemoryReflection({
  businessName,
  industry,
  goals,
  people,
  calendarConnected,
}: BusinessMemoryReflectionProps) {
  const orderedGoals = sortGoalsByPriority(goals);

  return (
    <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-8">
      <h2 className="text-lg font-semibold leading-snug">I&apos;ve started getting to know your business.</h2>
      <p className="mt-2 max-w-md text-ink-faint">
        Everything you&apos;ve shared during onboarding has become part of how I&apos;ll understand your
        business from now on.
      </p>

      <dl className="mt-6 flex flex-col gap-4">
        <div>
          <dt className="font-mono text-xs uppercase tracking-wide text-ink-faint">Business</dt>
          <dd className="text-ink">{businessName}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-wide text-ink-faint">Industry</dt>
          <dd className="text-ink">{industry}</dd>
        </div>

        {orderedGoals.length > 0 && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-wide text-ink-faint">Current priorities</dt>
            <dd>
              <ul className="mt-1 flex flex-col gap-1">
                {orderedGoals.map((goal) => (
                  <li key={goal.id} className="text-ink">
                    {goal.description}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {people.length > 0 && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-wide text-ink-faint">
              People who matter to your business
            </dt>
            <dd>
              <ul className="mt-1 flex flex-col gap-1">
                {people.map((person) => (
                  <li key={person.id} className="text-ink">
                    {person.name}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {calendarConnected ? (
        <p className="mt-6 max-w-md text-ink-faint">
          I&apos;m already using this understanding to interpret everything I observe about your business —
          putting it to work as I watch for what matters, what doesn&apos;t, and where your attention is
          needed most.
        </p>
      ) : (
        <>
          <p className="mt-6 max-w-md text-ink-faint">
            I&apos;ll use this understanding to interpret everything I observe about your business. The
            next thing I need is access to your Calendar so I can begin putting that understanding to work.
          </p>
          <div className="mt-4">
            <a
              href="/api/integrations/google-calendar/connect"
              className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
            >
              Connect Google Calendar
            </a>
          </div>
        </>
      )}
    </div>
  );
}
