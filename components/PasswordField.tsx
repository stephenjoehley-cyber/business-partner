'use client';

import { useState } from 'react';
import { FormField, inputClasses } from './FormField';

interface PasswordFieldProps {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  required?: boolean;
  minLength?: number;
  error?: string;
}

/**
 * A password input with a show/hide toggle, sharing the same FormField
 * wrapper and inputClasses styling as every other field. Used identically
 * on Login, Signup, and Reset-password — one implementation, not three,
 * so the behaviour (and any future change to it) stays consistent across
 * the whole Authentication feature family.
 */
export function PasswordField({
  label,
  htmlFor,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  error,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={htmlFor} error={error}>
      <div className="relative">
        <input
          id={htmlFor}
          type={isVisible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`${inputClasses} pr-16`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-ink-faint transition-colors hover:text-ink focus-ring"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
    </FormField>
  );
}
