/**
 * Asset 024 — Done & Due Experience Specification, 23 July 2026.
 * "Done. Always first. This establishes trust before asking for
 * attention." Checklist presentation, not prose — matches the spec's
 * own visual examples (✓ items) rather than a single sentence.
 *
 * Empty state (Asset 024, "Empty States"): legitimate, never padded to
 * avoid an empty screen. "Everything that could be handled
 * automatically has been completed" — the spec's own exact wording,
 * used verbatim here rather than paraphrased.
 */
export function DoneSection({ items }: { items: string[] }) {
  return (
    <div className="mb-6">
      <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">Done</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">
          Everything that could be handled automatically has been completed.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-faint">
              <span aria-hidden className="mt-0.5 text-brass">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
