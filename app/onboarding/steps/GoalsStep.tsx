'use client';

import { useState } from 'react';
import { inputClasses } from '@/components/FormField';
import type { Goal } from '@prisma/client';
import type { GoalFormValues } from '@/lib/brain/validation';

interface Props {
  initialValues?: Goal[];
  onSubmit: (values: GoalFormValues[]) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export function GoalsStep({ initialValues, onSubmit, onBack, isSubmitting }: Props) {
  const [goals, setGoals] = useState<string[]>(
    initialValues && initialValues.length > 0
      ? initialValues.sort((a, b) => a.priority - b.priority).map((g) => g.description)
      : ['']
  );

  function updateGoal(index: number, value: string) {
    setGoals((prev) => prev.map((g, i) => (i === index ? value : g)));
  }

  function addGoal() {
    setGoals((prev) => [...prev, '']);
  }

  function removeGoal(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values: GoalFormValues[] = goals
      .map((description) => description.trim())
      .filter((description) => description.length > 0)
      .map((description, i) => ({ description, priority: i + 1 }));
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">What matters most right now?</h1>
        <p className="mt-1 text-ink-faint">
          List your priorities in order. Done &amp; Due will weigh recommendations against these.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {goals.map((goal, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="font-mono text-xs text-brass">{String(index + 1).padStart(2, '0')}</span>
            <input
              className={inputClasses}
              value={goal}
              onChange={(e) => updateGoal(index, e.target.value)}
              placeholder={index === 0 ? 'e.g. Win 3 new commercial fleet customers' : 'Another priority…'}
            />
            {goals.length > 1 && (
              <button
                type="button"
                onClick={() => removeGoal(index)}
                className="text-sm text-ink-faint hover:text-signal-attention focus-ring"
                aria-label={`Remove goal ${index + 1}`}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addGoal}
        className="self-start text-sm font-medium text-brass-deep hover:underline focus-ring"
      >
        + Add another priority
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
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-ink px-5 py-2.5 font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
