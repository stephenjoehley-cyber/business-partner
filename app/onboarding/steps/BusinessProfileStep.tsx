'use client';

import { useState } from 'react';
import { FormField, inputClasses } from '@/components/FormField';
import type { BusinessProfileFormValues } from '@/lib/brain/validation';

interface Props {
  initialValues?: Partial<BusinessProfileFormValues>;
  onSubmit: (values: BusinessProfileFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function BusinessProfileStep({ initialValues, onSubmit, isSubmitting }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [industry, setIndustry] = useState(initialValues?.industry ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [website, setWebsite] = useState(initialValues?.website ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, industry, description, website });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">What is your business?</h1>
        <p className="mt-1 text-ink-faint">
          A website, a short description, or just a few words — whatever you have is enough to start.
        </p>
      </div>

      <FormField label="Business name" htmlFor="name">
        <input
          id="name"
          required
          className={inputClasses}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Meridian Gearbox Specialists"
        />
      </FormField>

      <FormField label="Industry" htmlFor="industry">
        <input
          id="industry"
          required
          className={inputClasses}
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Automotive repair"
        />
      </FormField>

      <FormField label="Website (optional)" htmlFor="website">
        <input
          id="website"
          type="url"
          className={inputClasses}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
        />
      </FormField>

      <FormField label="Tell me about it (optional)" htmlFor="description">
        <textarea
          id="description"
          rows={4}
          className={inputClasses}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you do, who you serve, what makes you different…"
        />
      </FormField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 self-start rounded bg-ink px-5 py-2.5 font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50 focus-ring"
      >
        {isSubmitting ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}
