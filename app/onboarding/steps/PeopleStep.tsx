'use client';

import { useState } from 'react';
import { inputClasses } from '@/components/FormField';
import type { PersonFormValues } from '@/lib/brain/validation';

interface Props {
  onSubmit: (values: PersonFormValues[]) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

type DraftPerson = { name: string; relationship: PersonFormValues['relationship']; email: string };

const RELATIONSHIPS: PersonFormValues['relationship'][] = [
  'customer',
  'prospect',
  'supplier',
  'employee',
  'partner',
];

export function PeopleStep({ onSubmit, onBack, isSubmitting }: Props) {
  const [people, setPeople] = useState<DraftPerson[]>([{ name: '', relationship: 'customer', email: '' }]);

  function update(index: number, field: keyof DraftPerson, value: string) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addRow() {
    setPeople((prev) => [...prev, { name: '', relationship: 'customer', email: '' }]);
  }

  function removeRow(index: number) {
    setPeople((prev) => prev.filter((_, i) => i !== index));
  }

  async function finish(withPeople: boolean) {
    const values: PersonFormValues[] = withPeople
      ? people
          .filter((p) => p.name.trim().length > 0)
          .map((p) => ({ name: p.name.trim(), relationship: p.relationship, email: p.email || undefined }))
      : [];
    await onSubmit(values);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Who are the key people in your business?</h1>
        <p className="mt-1 text-ink-faint">
          A few important customers or contacts. You can add the rest later — this just helps your Brief feel
          specific from day one.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {people.map((person, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClasses} flex-1 min-w-[160px]`}
              value={person.name}
              onChange={(e) => update(index, 'name', e.target.value)}
              placeholder="Name"
            />
            <select
              className={`${inputClasses} w-auto`}
              value={person.relationship}
              onChange={(e) => update(index, 'relationship', e.target.value)}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <input
              className={`${inputClasses} flex-1 min-w-[160px]`}
              value={person.email}
              onChange={(e) => update(index, 'email', e.target.value)}
              placeholder="Email (optional)"
              type="email"
            />
            {people.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-sm text-ink-faint hover:text-signal-attention focus-ring"
                aria-label={`Remove person ${index + 1}`}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addRow}
        className="self-start text-sm font-medium text-brass-deep hover:underline focus-ring"
      >
        + Add another person
      </button>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-surface-border px-5 py-2.5 font-medium text-ink hover:bg-surface-card focus-ring"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => finish(false)}
          disabled={isSubmitting}
          className="rounded border border-surface-border px-5 py-2.5 font-medium text-ink-faint hover:bg-surface-card focus-ring"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={() => finish(true)}
          disabled={isSubmitting}
          className="rounded bg-brass px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
        >
          {isSubmitting ? 'Finishing…' : "I've already been busy — let's go"}
        </button>
      </div>
    </div>
  );
}
