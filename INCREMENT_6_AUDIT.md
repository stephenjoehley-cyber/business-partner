# Increment 6 — Executive Presence Audit & Implementation Plan

Prepared by: Claude (Chief Software Engineer)
Reviewed against: Asset 016 (Executive Presence Specification), Asset 017 (Editorial Style Guide), Product Principles, Constitution, Increment 6 brief.
Scope: the experience as a first-time founder would encounter it — `/morning-brief`, Demo Mode, and the surfaces that support them. No code has been changed. This document is Stage 1 and Stage 2 only.

---

## Stage 1 — Executive Presence Audit

### CRITICAL

**C1. The Demo Mode banner exposes raw configuration to the owner.**
`app/morning-brief/DemoModeBanner.tsx` renders, verbatim, in the primary experience:
> "Connect Supabase and set `NEXT_PUBLIC_DEMO_MODE=false` to run against a real account."

- **Why it violates governance:** Asset 016 Principle 3 (Human Executive Language) — "never expose environment variables... never expose implementation details." Asset 017 §4 bans system terminology in front of an owner. The Increment 6 brief names this exact failure mode directly: "without exposing environment variables or implementation details."
- **Recommended change:** Replace with a single calm sentence that says this is a demonstration, and that it looks and behaves like the real product would. No instructions for reconfiguring infrastructure belong in the product itself — that's documentation, not product copy.
- **Expected improvement:** The one place in the product most likely to make a founder think "I'm looking at engineering setup" becomes, instead, a confident statement of what they're looking at.

**C2. The raw signal feed shows database enum values directly.**
`app/morning-brief/page.tsx` (the "Signals (raw feed)" section) renders `signal.domain` as an uppercase badge (`email`, `calendar`, `crm`...) and `signal.type.replaceAll('_', ' ')` — a lightly formatted enum, not a sentence — plus `signal.occurredAt.toLocaleString()`, a full machine-precision timestamp.

- **Why it violates governance:** Asset 017 §4, verbatim: "Never show a value exactly as it exists in a database or a type definition... even lightly formatted." Asset 016 Principle 5 bans exactly this kind of timestamp in the primary view.
- **Notable context:** `SignalPreviewPanel.tsx`'s own docstring already says this section is "intentionally a raw preview, not a designed experience — the real Morning Brief ships in Increment 6." This is documented, anticipated debt, not a new discovery — it's the debt this increment exists to close.
- **A plain-language version already exists and isn't being used here:** `lib/signals/describe.ts` (`describeSignalPlainly`) does exactly this translation and is already used correctly in `MorningBriefCard`'s evidence disclosure. The raw feed section simply doesn't call it.
- **Recommended change:** see Open Question A below — this is a judgement call for you, not something to resolve unilaterally in code.

**C3. Three competing calls to action on one screen.**
On a page that already has a Morning Brief card, the owner also sees a "Prepare my Morning Brief" button (`RecommendationTrigger`) and a "Refresh signals" button (`SignalPreviewPanel`), both always visible, both always active.

- **Why it violates governance:** Product Principle 3, "One Screen. One Decision." Asset 016 Principle 6, "One Thought At A Time" — the test given there is "did the owner's eye go anywhere else first," and here it has two places to go before it reaches the recommendation.
- **A deeper issue than layout:** a button inviting the owner to manually re-run the reasoning engine, sitting directly under the answer it already produced, quietly undermines the Constitution's Principle -1 ("Business software waits. Business Partners notice.") and the First-Time User Experience's closing promise ("I've already started," never "you're ready to start"). It reintroduces the idea that the owner is operating machinery.
- **Recommended change:** see Open Question C below.

### IMPORTANT

**I1. "Executive cycle" language appears in owner-facing copy.**
The empty state in `page.tsx` reads: "Refresh your signals below, then run your first executive cycle."

- **Why it violates governance:** "Cycle" is Cognitive Engine architecture vocabulary (Observe → Understand → Prioritise → Recommend), not owner language. Asset 017 §1: "If a sentence could plausibly appear in... a developer's mental model rather than an owner's, it is not in Business Partner's voice."
- **Recommended change:** something like "Once your signals are in, I'll prepare your first recommendation" — judgement-first, no internal process name.

**I2. A database-count stat block sits inside the empty state card.**
The `<dl>` grid showing `Goals: 2 / People: 3 / Industry: ...` in monospace numerals reads as a dashboard tile, not an executive judgement — it reports what exists rather than concluding anything about it.

- **Why it's product debt:** Increment 6 Outcome 8 names "unnecessary information" and "implementation leakage" directly. This block doesn't help the owner decide anything; it's a database summary.
- **Recommended change:** either remove it, or fold the same information into one sentence of prose ("I have your goals and key people — once your signals are in, I'll get to work").

**I3. Monospace/uppercase-tracked labels are used pervasively as UI chrome.**
The "Business Partner" wordmark, "Recommended next action," "View supporting evidence (N)," the confidence register label, onboarding step numbers, and the Demo Mode label are all rendered in `font-mono text-xs uppercase tracking-wide`.

- **Why it's worth flagging:** monospace type is a strong, specific visual signal — it reads as terminal/code output regardless of what the words say. This may be an intentional Design System decision (a deliberate "studio ledger" aesthetic) rather than a defect — **I don't have the Design System asset in front of me to judge this with confidence**, so I'm flagging it rather than asserting a violation. See Open Question B.

### POLISH

**P1.** Auth pages (`login`, `signup`) surface Supabase's raw error strings directly (`signInError.message`) rather than a Business-Partner-voiced equivalent. Lower priority — these screens sit outside the Morning Brief experience the brief calls "the product," and the non-goals explicitly exclude new screens. Worth a one-line fix, not a redesign.

**P2.** Onboarding step labels ("01 / Your business") share the monospace-numeral pattern in I3 — same open question, not a separate decision.

**P3.** `RecommendationTrigger`'s failure copy ("Could not prepare your Morning Brief.") is already reasonably in-voice. No change needed unless I3/C3 changes the component's shape anyway.

### What is already correct and should not be touched

`lib/ui/time.ts`, `lib/shared/time.ts`, `lib/signals/describe.ts`, `lib/narrative/confidenceRegister.ts`, and `MorningBriefCard`/`AllClearCard`'s handling of confidence and timestamps are already fully compliant with Asset 016 — this is the Increment 4 Founder Experience Review's work holding up correctly. None of it should be revisited as part of this increment; the audit above confirms the architecture is sound and the remaining problems are exactly where the brief said they'd be: presentation, not reasoning.

---

## Stage 2 — Implementation Plan

### Files expected to change

| File | Change |
|---|---|
| `app/morning-brief/DemoModeBanner.tsx` | Rewrite copy — remove env var and "Connect Supabase" language (C1) |
| `app/morning-brief/page.tsx` | Remove or redesign the raw signal feed section (C2); resolve empty-state copy (I1) and stat block (I2) |
| `app/morning-brief/SignalPreviewPanel.tsx` | Likely removed or folded into a single, subordinate action, pending Open Question A/C |
| `app/morning-brief/RecommendationTrigger.tsx` | Visibility/copy revised depending on Open Question C |
| `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` | One-line error copy fix (P1) — only if you want it in this increment |

No changes expected in `lib/cognition/`, `lib/narrative/`, `lib/signals/` (reasoning, pipeline, or persistence), `lib/demo/`, or `prisma/schema.prisma`. This is a presentation-only increment; nothing about how Business Partner decides should move.

### Sequencing

1. **C1 — Demo Mode banner rewrite.** Isolated, no dependencies, no open questions.
2. **C2/C3/I1/I2 together** — these four all live in the same section of `page.tsx` and depend on Open Questions A and C below, so they should be decided and implemented as one unit rather than piecemeal.
3. **I3 — typography review** — deferred until Open Question B is answered; touches many files but is low-risk once decided.
4. **P1/P2** — optional, can be folded in or deferred to a later increment without cost.

### Architectural considerations

Everything above is a rendering change. `SignalProvider`, the Cognitive Engine pipeline, and the Narrative Layer are untouched — signals continue to be generated and stored exactly as they are now; only what's rendered directly from `page.tsx` changes. Removing or relocating the raw feed does not require touching `lib/signals/repository.ts` or the pipeline.

### What should deliberately remain unchanged

The Cognitive Engine, Narrative Layer (including the v2 prompt contract, already correctly wired in), Signal pipeline, Prisma schema, Demo Mode seeding (`lib/demo/*`), and the confidence/time utilities. All of it already reflects Asset 016/017 and was the subject of the Increment 4 review — re-touching it isn't in scope and isn't warranted.

### Product debt expected to be removed

The raw signal feed as a first-class page section; the "executive cycle" phrasing; the database-count stat tile; the env-var-exposing Demo Mode copy; a persistently-visible manual trigger competing with the recommendation card.

### Technical or architectural debt discovered

None found beyond what was already documented. `SignalPreviewPanel.tsx`'s own comments correctly anticipated this cleanup as Increment 6 work — this is expected, tracked debt being paid down on schedule, not a new finding. The audit otherwise confirms DECISIONS.md's own assessment: the architecture is stable, and what remains is presentation.

### Open questions for Founder decision

**A. Should raw signal evidence remain accessible anywhere in the interface, or disappear entirely?**
Signals are already available as plain-language evidence one click away inside the Morning Brief card's "View supporting evidence" disclosure (via `describeSignalPlainly`). My recommendation: retire the separate raw feed section entirely rather than reformat it — it would duplicate evidence the recommendation card already discloses, and a second evidence surface competes with the first (Asset 016 Principle 6). But this removes a page section a stakeholder demo may have gotten used to seeing, so it's your call, not mine to assume.

**B. Is monospace/uppercase-tracked type an intentional Design System decision, or leftover default?**
I don't have the Design System asset available to judge this independently. If it's deliberate house style, I1/I3 is a non-issue and I'll leave it. If it's a default that crept in, it should change everywhere at once, not component-by-component.

**C. Should the manual "Prepare my Morning Brief" trigger remain visible once a brief already exists?**
My recommendation: show it only in the true empty state (no brief has ever been generated) or fold it into a much quieter, secondary affordance once a brief exists — never as a persistent button beside the answer. This is the one architectural/UX judgement call in this plan with a real trade-off (demo re-runnability vs. executive calm), so I'm flagging it rather than deciding it.

---

*No code has been changed. Awaiting Founder review of this audit and plan before Stage 4 (implementation) begins.*
