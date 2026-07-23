'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormField, inputClasses } from '@/components/FormField';

type RelationshipType = 'customer' | 'prospect' | 'supplier' | 'employee' | 'partner';

interface GoalSummary {
  id: string;
  description: string;
}

interface PersonSummary {
  id: string;
  name: string;
  relationship: string;
  email?: string;
  company?: string;
}

/**
 * Continuous Executive Learning (v1) — Product Audit, 17/18 July 2026.
 * Lets an owner add a Goal or Person after onboarding, and immediately
 * see the effect on tomorrow's Morning Brief. This is the first
 * production implementation of a permanent product capability, not an
 * investor-demo feature — see DECISIONS.md and the Executive Design
 * Authority Brief.
 *
 * 2026-07-19: added visible lists of what's already saved, then
 * deletion, then editing — each found live in sequence: an owner had no
 * way to see what was already saved, then no way to correct a duplicate
 * entry, then no way to fix a genuine mistake in wording rather than
 * delete-and-re-add it. Lists update optimistically on every action.
 *
 * Deletion has no confirmation dialog (mild, easily re-added, unlike
 * the full "delete this business" flow). Editing is inline — click
 * "Edit," the row becomes a small form, "Save" or "Cancel."
 *
 * The "Refresh my Morning Brief" action is a deliberate Phase 1 teaching
 * aid, not the permanent interaction model: making cause and effect
 * visible and owner-initiated builds trust in the mechanism itself,
 * before Business Partner earns the right to refresh invisibly. A later
 * phase may make this automatic, at which point this button's job is
 * done.
 *
 * 2026-07-19: Executive Presence Increment 1 — Demonstrating
 * Understanding (per the Executive Presence Audit, 19 July 2026). Save
 * confirmations reworded from a bare "Saved." to "Saved. I'll take this
 * into account in future recommendations." — acknowledging
 * understanding, not just successful persistence. Deliberately
 * timeless, not tied to a specific moment ("tomorrow's reasoning") per
 * the Founder's explicit correction — the next relevant signal might
 * not arrive for days, and the sentence needs to remain true regardless
 * of when that turns out to be.
 *
 * 2026-07-19: Recommendation 2, approved by Founder + CPO — an optional
 * Company field on Person. Deliberately Business Memory, not something
 * Calendar or Gmail could ever supply (neither has a company field at
 * all) — knowledge only the owner can reliably provide. Deliberately
 * added here, in Settings, not to onboarding's People step, per the
 * CPO's explicit principle: "Onboarding establishes identity.
 * Continuous Executive Learning builds understanding."
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
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalDescription, setEditGoalDescription] = useState('');
  const [isSavingGoalEdit, setIsSavingGoalEdit] = useState(false);

  const [people, setPeople] = useState(initialPeople);
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('customer');
  const [personEmail, setPersonEmail] = useState('');
  const [personCompany, setPersonCompany] = useState('');
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [personStatus, setPersonStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonRelationship, setEditPersonRelationship] = useState<RelationshipType>('customer');
  const [editPersonEmail, setEditPersonEmail] = useState('');
  const [editPersonCompany, setEditPersonCompany] = useState('');
  const [isSavingPersonEdit, setIsSavingPersonEdit] = useState(false);

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
      const { goal } = await res.json();
      setGoals((prev) => [...prev, { id: goal.id, description: goal.description }]);
      setGoalStatus('saved');
      setGoalDescription('');
    } else {
      setGoalStatus('error');
    }
  }

  async function handleDeleteGoal(id: string) {
    setDeletingGoalId(id);
    const res = await fetch(`/api/business-memory/goals/${id}`, { method: 'DELETE' });
    setDeletingGoalId(null);
    if (res.ok) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }

  function startEditGoal(goal: GoalSummary) {
    setEditingGoalId(goal.id);
    setEditGoalDescription(goal.description);
  }

  async function handleSaveGoalEdit(id: string) {
    if (!editGoalDescription.trim()) return;
    setIsSavingGoalEdit(true);

    const res = await fetch(`/api/business-memory/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editGoalDescription.trim() }),
    });

    setIsSavingGoalEdit(false);
    if (res.ok) {
      const { goal } = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === id ? { id: goal.id, description: goal.description } : g)));
      setEditingGoalId(null);
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
        company: personCompany.trim() || undefined,
      }),
    });

    setIsSavingPerson(false);
    if (res.ok) {
      const { person } = await res.json();
      setPeople((prev) => [
        ...prev,
        {
          id: person.id,
          name: person.name,
          relationship: person.relationship,
          email: person.email ?? undefined,
          company: person.company ?? undefined,
        },
      ]);
      setPersonStatus('saved');
      setPersonName('');
      setPersonEmail('');
      setPersonCompany('');
    } else {
      setPersonStatus('error');
    }
  }

  async function handleDeletePerson(id: string) {
    setDeletingPersonId(id);
    const res = await fetch(`/api/business-memory/people/${id}`, { method: 'DELETE' });
    setDeletingPersonId(null);
    if (res.ok) {
      setPeople((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function startEditPerson(person: PersonSummary) {
    setEditingPersonId(person.id);
    setEditPersonName(person.name);
    setEditPersonRelationship(person.relationship as RelationshipType);
    setEditPersonEmail(person.email ?? '');
    setEditPersonCompany(person.company ?? '');
  }

  async function handleSavePersonEdit(id: string) {
    if (!editPersonName.trim()) return;
    setIsSavingPersonEdit(true);

    const res = await fetch(`/api/business-memory/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editPersonName.trim(),
        relationship: editPersonRelationship,
        email: editPersonEmail.trim() || undefined,
        company: editPersonCompany.trim() || undefined,
      }),
    });

    setIsSavingPersonEdit(false);
    if (res.ok) {
      const { person } = await res.json();
      setPeople((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                id: person.id,
                name: person.name,
                relationship: person.relationship,
                email: person.email ?? undefined,
                company: person.company ?? undefined,
              }
            : p
        )
      );
      setEditingPersonId(null);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshStatus('idle');

    const res = await fetch('/api/recommendations/generate', { method: 'POST' });

    setIsRefreshing(false);
    if (res.ok) {
      setRefreshStatus('done');
      // Found live, 19 July 2026: router.push() + router.refresh() is a
      // known-fragile pattern in Next.js's client-side router — if
      // /morning-brief had already been visited earlier in the same
      // browser session, push() could still serve a cached client-side
      // render regardless of the refresh() call right after. A hard
      // navigation bypasses the client router entirely, guaranteeing a
      // genuinely fresh server request every time — the belt-and-
      // suspenders companion to marking that page force-dynamic.
      window.location.href = '/morning-brief';
    } else {
      setRefreshStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {goals.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {goals.map((g) =>
              editingGoalId === g.id ? (
                <li key={g.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    className={inputClasses}
                    value={editGoalDescription}
                    onChange={(e) => setEditGoalDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveGoalEdit(g.id)}
                    disabled={isSavingGoalEdit || !editGoalDescription.trim()}
                    className="focus-ring whitespace-nowrap text-xs text-ink underline disabled:opacity-50"
                  >
                    {isSavingGoalEdit ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGoalId(null)}
                    className="focus-ring whitespace-nowrap text-xs text-ink-faint underline"
                  >
                    Cancel
                  </button>
                </li>
              ) : (
                <li key={g.id} className="flex items-center justify-between gap-2 text-sm text-ink">
                  <span>• {g.description}</span>
                  <span className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => startEditGoal(g)}
                      className="focus-ring text-xs text-ink-faint underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      disabled={deletingGoalId === g.id}
                      className="focus-ring text-xs text-ink-faint underline disabled:opacity-50"
                    >
                      {deletingGoalId === g.id ? 'Removing…' : 'Remove'}
                    </button>
                  </span>
                </li>
              )
            )}
          </ul>
        )}

        <FormField label="Add a priority" htmlFor="goalDescription">
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddGoal}
            disabled={isSavingGoal || !goalDescription.trim()}
            className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {isSavingGoal ? 'Saving…' : 'Add priority'}
          </button>
          {goalStatus === 'saved' && (
            <p className="text-sm text-ink-faint">Saved. I&apos;ll take this into account in future recommendations.</p>
          )}
          {goalStatus === 'error' && (
            <p className="text-sm text-signal-attention">Something went wrong — please try again.</p>
          )}
        </div>
      </div>

      <div className="border-t border-surface-border pt-6">
        {people.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {people.map((p) =>
              editingPersonId === p.id ? (
                <li key={p.id} className="flex flex-col gap-2 rounded border border-surface-border p-3">
                  <input
                    type="text"
                    placeholder="Name"
                    className={inputClasses}
                    value={editPersonName}
                    onChange={(e) => setEditPersonName(e.target.value)}
                  />
                  <select
                    className={inputClasses}
                    value={editPersonRelationship}
                    onChange={(e) => setEditPersonRelationship(e.target.value as RelationshipType)}
                  >
                    <option value="customer">Customer</option>
                    <option value="prospect">Prospect</option>
                    <option value="supplier">Supplier</option>
                    <option value="employee">Employee</option>
                    <option value="partner">Partner</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Company (optional)"
                    className={inputClasses}
                    value={editPersonCompany}
                    onChange={(e) => setEditPersonCompany(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    className={inputClasses}
                    value={editPersonEmail}
                    onChange={(e) => setEditPersonEmail(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSavePersonEdit(p.id)}
                      disabled={isSavingPersonEdit || !editPersonName.trim()}
                      className="focus-ring text-xs text-ink underline disabled:opacity-50"
                    >
                      {isSavingPersonEdit ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPersonId(null)}
                      className="focus-ring text-xs text-ink-faint underline"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm text-ink">
                  <span>
                    • {p.name} <span className="text-ink-faint">({p.relationship}{p.company ? ` at ${p.company}` : ''})</span>
                  </span>
                  <span className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => startEditPerson(p)}
                      className="focus-ring text-xs text-ink-faint underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePerson(p.id)}
                      disabled={deletingPersonId === p.id}
                      className="focus-ring text-xs text-ink-faint underline disabled:opacity-50"
                    >
                      {deletingPersonId === p.id ? 'Removing…' : 'Remove'}
                    </button>
                  </span>
                </li>
              )
            )}
          </ul>
        )}

        <FormField label="Add a relationship" htmlFor="personName">
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
          <FormField label="Company (optional)" htmlFor="personCompany">
            <input
              id="personCompany"
              type="text"
              placeholder="e.g. Acme Corp"
              className={inputClasses}
              value={personCompany}
              onChange={(e) => setPersonCompany(e.target.value)}
            />
          </FormField>
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

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddPerson}
            disabled={isSavingPerson || !personName.trim()}
            className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            {isSavingPerson ? 'Saving…' : 'Add relationship'}
          </button>
          {personStatus === 'saved' && (
            <p className="text-sm text-ink-faint">Saved. I&apos;ll take this into account in future recommendations.</p>
          )}
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
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
