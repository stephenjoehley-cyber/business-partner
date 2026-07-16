'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Business, Goal, Person } from '@prisma/client';
import { BusinessProfileStep } from './steps/BusinessProfileStep';
import { GoalsStep } from './steps/GoalsStep';
import { PeopleStep } from './steps/PeopleStep';
import type { BusinessProfileFormValues, GoalFormValues, PersonFormValues } from '@/lib/brain/validation';

type BusinessWithRelations = (Business & { goals: Goal[]; people: Person[] }) | null;

const STEPS = ['Your business', 'Your goals', 'Key people'] as const;

interface WizardError {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function resumeStepIndex(business: BusinessWithRelations): number {
  if (!business) return 0;
  if (business.goals.length === 0) return 1;
  return 2;
}

export function OnboardingWizard({ initialBusiness }: { initialBusiness: BusinessWithRelations }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(() => resumeStepIndex(initialBusiness));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<WizardError | null>(null);
  // People has been saved but the inaugural Morning Brief hasn't been
  // generated yet — a distinct state from the People form itself, so a
  // failure here is retryable on its own without resubmitting People.
  const [peopleSaved, setPeopleSaved] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

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
    setPeopleSaved(true);
    await finalize();
  }

  // Onboarding is only complete once Business Partner has genuinely
  // generated the inaugural Morning Brief (Founder decision, Item 7) —
  // not merely because People was submitted. Safe to call again after a
  // prior failure: nothing here re-touches Business Profile, Goals, or
  // People.
  async function finalize() {
    setIsFinalizing(true);
    try {
      await postJSON('/api/onboarding/complete');
      router.push('/morning-brief');
      router.refresh();
    } catch {
      // error state already set by postJSON; stay on the finalize panel
      // so the owner can retry directly.
    } finally {
      setIsFinalizing(false);
    }
  }

  async function postJSON(url: string, body?: unknown): Promise<void> {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return;

      const data = await res.json().catch(() => null);
      // Zod's `.flatten()` puts field-level messages under `fieldErrors`,
      // not `formErrors` — reading only `formErrors` (the previous
      // behaviour) meant these specific, already-written messages never
      // reached the owner. Read fieldErrors first.
      const fieldMessage: string | undefined = data?.error?.fieldErrors
        ? (Object.values(data.error.fieldErrors) as string[][]).flat()[0]
        : undefined;
      const message =
        fieldMessage ??
        data?.error?.formErrors?.[0] ??
        (typeof data?.error === 'string' ? data.error : undefined) ??
        'Something went wrong. Please try again.';

      setError(
        res.status === 401 ? { message, actionHref: '/login', actionLabel: 'Sign in again' } : { message },
      );
      throw new Error(message);
    } catch (e) {
      // Reached directly (without the block above) only on a genuine
      // network-level failure — fetch() itself threw. Functional update
      // leaves an already-set, more specific message untouched.
      setError((current) => current ?? { message: 'Something went wrong. Please try again.' });
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
          {error.message}
          {error.actionHref && error.actionLabel && (
            <>
              {' '}
              <Link href={error.actionHref} className="font-medium underline underline-offset-2">
                {error.actionLabel}
              </Link>
            </>
          )}
        </p>
      )}

      {stepIndex === 0 && (
        <BusinessProfileStep
          initialValues={
            initialBusiness
              ? {
                  name: initialBusiness.name,
                  industry: initialBusiness.industry,
                  description: initialBusiness.description ?? undefined,
                  website: initialBusiness.website ?? undefined,
                }
              : undefined
          }
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
      {stepIndex === 2 && !peopleSaved && (
        <PeopleStep onSubmit={submitPeople} onBack={() => setStepIndex(1)} isSubmitting={isSubmitting} />
      )}
      {stepIndex === 2 && peopleSaved && (
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">Getting ready…</h1>
          <p className="text-ink-faint">
            {isFinalizing
              ? "I'm putting together your first Morning Brief."
              : "I wasn't able to finish just now."}
          </p>
          {!isFinalizing && (
            <button
              type="button"
              onClick={finalize}
              className="rounded bg-ink px-5 py-2.5 font-medium text-surface transition-opacity hover:opacity-90 focus-ring"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}