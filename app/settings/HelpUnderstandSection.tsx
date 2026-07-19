'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormField, inputClasses } from '@/components/FormField';

type RelationshipType = 'customer' | 'prospect' | 'supplier' | 'employee' | 'partner';

interface GoalSummary {
  description: string;
}

interface PersonSummary {
  name: string;
  relationship: string;
}

/**
 * Continuous Executive Learning (v1) — Product Audit, 17/18 July 2026.
 * Lets an owner add a Goal or Person after onboarding, and immediately
 * see the effect on tomorrow's Morning Brief. This is the first
 * production implementation of a permanent product capability, not an
 * investor-demo feature — see DECISIONS.md and the Executive Design
 * Authority Brief.
 *
 * 2026-07-19: added visible lists of what's already saved. Found live:
 * an owner added a second goal and had no way to see the first one was
 * still there at all — the form only ever let you add, never showed you
 * what Business Partner already knew. Lists update optimistically on
 * save, so a newly added item appears immediately without a page reload.
 *
 * The "Refresh my Morning Brief" action is a deliberate Phase 1 teaching
 * aid, not the permanent interaction model: making cause and effect
 * visible and owner-initiated builds trust in the mechanism itself,
 * before Business Partner earns the right to refresh invisibly. A later
 * phase may make this automatic, at which point this button's job is
 * done.
 */
export function HelpUnderstandSection({
  initialGoals,
  initialPeople,
}: {
  initialGoals: GoalSummary[];
  initialPeople: PersonSummary[];
}) {
  const router = useRouter();

  const [goals, setGoals] = useState(initialGoals);
  const [goalDescription, setGoalDescription] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalStatus, setGoalStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [people, setPeople] = useState(initialPeople);
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('customer');
  const [personEmail, setPersonEmail] = useState('');
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [personStatus, setPersonStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'done' | 'error'>('idle');

  async function handleAddGoal() {
    if (!goalDescription.trim()) return;
    setIsSavingGoal(true);
    setGoalStatus('idle');

    const description = goalDescription.trim();
    const res = await fetch('/api/business-memory/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    setIsSavingGoal(false);
    if (res.ok) {
      setGoals((prev) => [...prev, { description }]);
      setGoalStatus('saved');
      setGoalDescription('');
    } else {
      setGoalStatus('error');
    }
  }

  async function handleAddPerson() {
    if (!personName.trim()) return;
    setIsSavingPerson(true);
    setPersonStatus('idle');

    const name = personName.trim();
    const res = await fetch('/api/business-memory/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        relationship,
        email: personEmail.trim() || undefined,
      }),
    });

    setIsSavingPerson(false);
    if (res.ok) {
      setPeople((prev) => [...prev, { name, relationship }]);
      setPersonStatus('saved');
      setPersonName('');
      setPersonEmail('');
    } else {
      setPersonStatus('error');
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshStatus('idle');

    const res = await fetch('/api/recommendations/generate', { method: 'POST' });

    setIsRefreshing(false);
    if (res.ok) {
      setRefreshStatus('done');
      router.push('/morning-brief');
      router.refresh();
    } else {
      setRefreshStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {goals.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {goals.map((g, i) => (
              <li key={i} className="text-sm text-ink">
                • {g.description}
              </li>
            ))}
          </ul>
        )}

        <FormField label="Add a goal" htmlFor="goalDescription">
          <input
            id="goalDescription"
            type="text"
            placeholder="e.g. Win our first client"
            className={inputClasses}
            value={goalDescription}
            onChange={(e) => {
              setGoalDescription(e.target.value);
              setGoalStatus('idle');
            }}
          />
        </FormField>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddGoal}
            disabled={isSavingGoal || !goalDescription.trim()}
            className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {isSavingGoal ? 'Saving…' : 'Add goal'}
          </button>
          {goalStatus === 'saved' && <p className="text-sm text-ink-faint">Saved.</p>}
          {goalStatus === 'error' && (
            <p className="text-sm text-signal-attention">Something went wrong — please try again.</p>
          )}
        </div>
      </div>

      <div className="border-t border-surface-border pt-6">
        {people.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {people.map((p, i) => (
              <li key={i} className="text-sm text-ink">
                • {p.name} <span className="text-ink-faint">({p.relationship})</span>
              </li>
            ))}
          </ul>
        )}

        <FormField label="Add a person" htmlFor="personName">
          <input
            id="personName"
            type="text"
            placeholder="Name"
            className={inputClasses}
            value={personName}
            onChange={(e) => {
              setPersonName(e.target.value);
              setPersonStatus('idle');
            }}
          />
        </FormField>

        <div className="mt-3">
          <label htmlFor="relationship" className="text-sm font-medium text-ink-soft">
            Relationship
          </label>
          <select
            id="relationship"
            className={inputClasses + ' mt-1.5'}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as RelationshipType)}
          >
            <option value="customer">Customer</option>
            <option value="prospect">Prospect</option>
            <option value="supplier">Supplier</option>
            <option value="employee">Employee</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        <div className="mt-3">
          <FormField label="Email (optional)" htmlFor="personEmail">
            <input
              id="personEmail"
              type="email"
              placeholder="name@example.com"
              className={inputClasses}
              value={personEmail}
              onChange={(e) => setPersonEmail(e.target.value)}
            />
          </FormField>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddPerson}
            disabled={isSavingPerson || !personName.trim()}
            className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {isSavingPerson ? 'Saving…' : 'Add person'}
          </button>
          {personStatus === 'saved' && <p className="text-sm text-ink-faint">Saved.</p>}
          {personStatus === 'error' && (
            <p className="text-sm text-signal-attention">Something went wrong — please try again.</p>
          )}
        </div>
      </div>

      <div className="border-t border-surface-border pt-6">
        <p className="text-sm text-ink-faint">
          Business Partner reasons over what it knows the next time it prepares your Morning Brief.
          Refresh now to see today&apos;s Brief reflect anything you&apos;ve just added.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="focus-ring inline-block rounded-md border border-surface-border px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh my Morning Brief'}
          </button>
          {refreshStatus === 'error' && (
            <p className="text-sm text-signal-attention">Something went wrong — please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
