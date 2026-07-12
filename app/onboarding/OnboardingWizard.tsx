'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Business, Goal, Person } from '@prisma/client';
import { BusinessProfileStep } from './steps/BusinessProfileStep';
import { GoalsStep } from './steps/GoalsStep';
import { PeopleStep } from './steps/PeopleStep';
import type { BusinessProfileFormValues, GoalFormValues, PersonFormValues } from '@/lib/brain/validation';

type BusinessWithRelations = (Business & { goals: Goal[]; people: Person[] }) | null;

const STEPS = ['Your business', 'Your goals', 'Key people'] as const;

export function OnboardingWizard({ initialBusiness }: { initialBusiness: BusinessWithRelations }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitProfile(values: BusinessProfileFormValues) {
    await postJSON('/api/onboarding/business', values);
    setStepIndex(1);
  }

  async function submitGoals(values: GoalFormValues[]) {
    await postJSON('/api/onboarding/goals', values);
    setStepIndex(2);
  }

  async function submitPeople(values: PersonFormValues[]) {
    await postJSON('/api/onboarding/people', values);
    router.push('/morning-brief');
    router.refresh();
  }

  async function postJSON(url: string, body: unknown) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.formErrors?.[0] ?? data?.error ?? 'Something went wrong. Please try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <ol className="flex gap-6 font-mono text-xs uppercase tracking-wide text-ink-faint">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 border-b-2 pb-2 ${
              i === stepIndex ? 'border-brass text-ink' : 'border-transparent'
            }`}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded border border-signal-attention/30 bg-signal-attention/10 px-4 py-3 text-sm text-signal-attention">
          {error}
        </p>
      )}

      {stepIndex === 0 && (
        <BusinessProfileStep
          initialValues={initialBusiness ?? undefined}
          onSubmit={submitProfile}
          isSubmitting={isSubmitting}
        />
      )}
      {stepIndex === 1 && (
        <GoalsStep
          initialValues={initialBusiness?.goals}
          onSubmit={submitGoals}
          onBack={() => setStepIndex(0)}
          isSubmitting={isSubmitting}
        />
      )}
      {stepIndex === 2 && (
        <PeopleStep onSubmit={submitPeople} onBack={() => setStepIndex(1)} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}
