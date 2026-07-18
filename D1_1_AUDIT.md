# Increment D1.1 — Executive Foundation & Settings Product Audit

Prepared by: Claude (Chief Software Engineer)
Reviewed against: Asset 021 (Executive Foundation and Reference Implementation Standard), Asset 020 (Executive Interface Manifesto), Asset 016, Asset 017, three precedent decisions committed 2026-07-18 (typography, Radix, icons).
Scope: `app/settings/page.tsx` and its components (`PreferredNameSection`, `DisconnectButton`, `ExportDataLink`, `DeleteBusinessSection`), plus the absence of any shared shell around it. `app/morning-brief/page.tsx` reviewed only to confirm it shares the same gap. No code has been changed. This is Stage 1 (Audit) only — Implementation Plan follows Founder review.

---

## Stage 1 — Executive Foundation Audit

### CRITICAL

**C1. There is no shared shell, and therefore no persistent navigation, anywhere in the product today.**
`app/layout.tsx` is a bare root layout (fonts + `<body>` only). Settings renders as an isolated `<main>` with a single plain-text "Back to your Morning Brief" link; Morning Brief has no navigation to Settings at all beyond that same one-way link. Neither page has a sidebar, account block, or any of the eight destinations shown in the approved mockup.

- **Why it matters for D1.1:** Asset 021 §2 requires the Reference Implementation to establish "shared hierarchy... shared responsive logic... shared interaction patterns" that future screens inherit — there is currently nothing to inherit from. This is the actual scope of D1.1, not a side detail: building the Executive Foundation *is* building this shell for the first time.
- **The truthfulness conflict this creates:** the mockup's nav lists Morning Brief, Insights, Customers, Projects, Tasks, Conversations, Documents, Settings. Only Morning Brief and Settings exist as real routes today. Asset 021 §13.1 is explicit: "Only real destinations should appear. Empty future sections must not be exposed merely to suggest product breadth." Building the nav exactly as shown would violate this directly.
- **This is Open Question A below** — a genuine product-scope judgement, not something I should resolve unilaterally.

**C2. Destructive action has no visual separation from routine actions.**
`DeleteBusinessSection`'s buttons use the exact same `border-surface-border` / `text-ink` neutral styling as `ExportDataLink` and every Connections button. There is no danger/risk colour token in `tailwind.config.ts` at all — only `signal.steady` and `signal.attention` exist.

- **Why it violates governance:** Asset 021 §10.4, verbatim: destructive actions "must remain rare, separated and explicit." §6.2 requires semantic colour to represent risk states. The approved mockup itself shows this — a distinct red-tinted "Danger zone" panel — so this isn't a new design idea, it's catching up to the approved reference.
- **Recommended change:** introduce a `danger` semantic colour role (mirroring the existing `signal` family) and give the delete-business panel its own visually distinct treatment, separated from Export in its own section, not sharing a card with it.

**C3. Cards are the default answer to every layout decision, with no weight differentiation.**
All three Settings sections (Personal, Connections, Your Business Data) wrap in identical `rounded-lg border bg-surface-card p-6` cards. Personal (one field) and Connections (two integration cards with real operational consequences) currently carry equal visual weight.

- **Why it violates governance:** Asset 021 §8.2, verbatim: "A card is not the default answer to layout... Business Partner should not resemble a mosaic of equally weighted cards." §9.1 asks for semantic component responsibility (a "setting row" is a different role than a "destructive action" or an "executive section"), not one generic container reused everywhere.
- **Recommended change:** this is the core of what the Executive Foundation's shared components need to solve — a small set of semantic primitives (setting row, connection card, danger panel) rather than one bordered box wrapping everything.

### IMPORTANT

**I1. The page opens directly into content with no statement of purpose.**
Asset 021 §3.2 and §4 both require judgement/purpose before mechanics — even Settings should "begin with what the section means before presenting how it is configured." The current page has a bare `<h1>Settings</h1>` and no framing sentence at all. The approved mockup supplies this ("You're in control of how Business Partner works with you and your business") plus a contextual right-hand panel reinforcing it.

- **Recommended change:** add a one-line page introduction in Business Partner's voice, consistent with Asset 017. Whether the right-hand contextual panel from the mockup is in scope for D1.1 is Open Question D below — it's a real scope decision, not just a styling one.

**I2. Section labels use monospace, uppercase, tracked type — an unresolved carryover from the Increment 6 audit.**
`Personal`, `Connections`, and `Your Business Data` all render as `font-mono text-xs uppercase tracking-wide`. Increment 6's audit flagged this exact pattern (its I3) as an open question at the time, absent a governing design asset. Asset 021 now exists and settles it directly: §5.2 explicitly assigns "settings" and "labels" to *Interface* typography, not editorial, and §5.3 says hierarchy should come from "role, size, weight, spacing... not... capitalisation." Monospace/uppercase for structural section labels isn't called for anywhere in Asset 021.

- **Recommended change:** I don't consider this an open question anymore — Asset 021 resolves it. I'll move section labels to plain Inter, appropriate weight, sentence case, in the Implementation Plan, unless you want to preserve monospace deliberately as a signature detail.

**I3. No desktop-specific layout exists; the product is single-column at every width.**
Asset 021 §14.1 permits (not requires) desktop to use "persistent navigation, primary reading column, supporting context... aligned settings or evidence rows." Today `max-w-lg` centers everything regardless of viewport — which is a perfectly legitimate mobile-first choice, but it means no desktop composition exists yet to evaluate against the mockup's two-column treatment.

- **This overlaps with Open Question A/D** — the shell and the contextual panel are the same underlying scope question.

### POLISH

**P1.** `.focus-ring` and `prefers-reduced-motion` are already implemented globally and correctly — no work needed here, worth noting as a foundation already satisfying Asset 021 §15/§16.

**P2.** Status feedback in `PreferredNameSection` (`saved`/`error` states) exists but I haven't yet verified its rendered copy against Asset 021 §12.3/§12.4 (calm, specific, no exaggeration) — need to view the full component before the Implementation Plan, not a structural finding yet.

**P3.** `DisconnectButton` and the two integration cards are structurally identical and already a reasonable candidate for a shared "connection card" component — low-risk, high-value extraction once the semantic component set exists.

---

## Open Questions (Founder judgement required)

**A. Navigation shell scope for D1.1.** Build the persistent shell now showing only real destinations — Morning Brief and Settings — with the remaining six items genuinely absent (per §13.1), or build the full eight-item nav with the not-yet-built destinations shown in an explicit "coming soon" state (which §12.5 does permit, and which the mockup itself already does for "Workspace" inside Settings)? This materially changes D1.1's scope and is the single biggest open decision.

**B. Contextual right-hand panel.** The mockup pairs primary content with a supporting panel ("Your preferences. Your business." / "Security at a glance"). Is this panel in scope for D1.1, or is D1.1 the primary-column Foundation only, with the contextual-panel pattern deferred to a later increment once more screens exist to prove it's genuinely reusable?

**C. Danger Zone copy tone.** The mockup's Danger Zone is terser than the current, more considered copy already in `DeleteBusinessSection` (which explains login persistence and invites feedback — deliberate prior Founder decisions, Decision Backlog Q11). Confirming: the visual treatment changes, the existing copy and confirmation flow stay as they are?

---

Once these three are settled, I'll write the Implementation Plan: the specific components (design tokens, layout shell, typography roles, semantic Settings components, Radix wrapper for the delete confirmation), the exact files touched, and the test plan — for your approval before any code is written.
