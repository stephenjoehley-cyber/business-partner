import { DeleteBusinessSection } from './DeleteBusinessSection';

/**
 * Visual separation only (Founder decision, 2026-07-18: "preserve the
 * existing copy, change only the visual treatment"). DeleteBusinessSection
 * itself is untouched — its copy, confirmation flow, and feedback field
 * are exactly as they were. This component exists solely to give the
 * Danger Zone the visual weight Asset 021 §10.4 requires for destructive
 * actions, using the `danger` colour family rather than `signal.attention`.
 */
export function DangerPanel({ businessName }: { businessName: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-surface p-6">
      <h3 className="font-medium text-danger">Danger zone</h3>
      <div className="mt-4">
        <DeleteBusinessSection businessName={businessName} />
      </div>
    </div>
  );
}
