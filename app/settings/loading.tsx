/**
 * Route-level loading state for /settings (Contract §16.1, §23). Settings
 * is server-rendered, so this only appears during navigation to the
 * route, not during in-page interaction — kept quiet and labelled rather
 * than an indefinite spinner, consistent with Asset 021 §12.1.
 */
export default function SettingsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-ink-faint" role="status" aria-live="polite">
        Loading your settings…
      </p>
    </div>
  );
}
