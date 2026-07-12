interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-signal-attention">{error}</p>}
    </div>
  );
}

export const inputClasses =
  'w-full rounded border border-surface-border bg-surface-card px-3 py-2 text-ink placeholder:text-ink-faint focus-ring';
