# Architectural Decision Log

Concise, dated, traceable. Each entry: what we decided, why, and what it costs us if we're wrong. Superseded decisions are struck through, not deleted.

---

## Permanent Architectural Principles

The entries below are not scoped to the increment that introduced them — they are standing constraints every future increment is expected to honour, the same way the Constitution and Product Principles documents govern the product. Each one grew out of a dated decision in the log below; that entry has the full reasoning. This register exists so a principle doesn't get lost in a long chronological list, and so a future increment that seems to violate one of these needs a deliberate, discussed exception rather than an accidental drift.

1. **Executive Honesty is a first-class Cognitive Engine output.** The Engine never returns "nothing" and never fabricates certainty — it always produces one of a small set of honest tiers (confident recommendation, low-confidence insight, all-clear), each with its own presentation rules. See 2026-07-13, "Executive Honesty."
2. **The Cognitive Engine decides. The Narrative Layer communicates.** Every fact, priority, and confidence value is decided upstream, deterministically, before any LLM is involved. The Narrative Layer may only rephrase what it's given — never reason, never add a fact, never change a decision. See 2026-07-13, "Introduced the LLM in a strictly constrained communication role."
3. **Structured recommendation contracts.** What the Cognitive Engine produces and what the Narrative Layer consumes are both explicit, typed, versioned shapes (`MorningBriefResult`, `NarrativeInput`/`Narrative`) — never a loosely-shaped string or an ad hoc object assembled per call site.
4. **Graceful degradation whenever the Narrative Layer is unavailable.** Provider failure, timeout, malformed output, or a failed validation all take the same path: fall back to the Cognitive Engine's own deterministic strings. The Morning Brief must work perfectly with zero LLM calls, always.
5. **Progressive disclosure with complete traceability.** The owner sees a calm, minimal default view, but every recommendation is one click away from the complete, unedited list of supporting signals it was reasoned from. Transparency is never more than a disclosure away.
6. **Render-time narrative generation, not persistence-time.** What's persisted is the deterministic Cognitive Engine output; language is generated fresh when the owner views it, so a provider outage never invalidates a stored brief and a future prompt-contract version improves old briefs automatically.
7. **Narrative Fidelity.** The Narrative Layer's purpose is faithful executive communication, not creativity. Every generated sentence must preserve the intent, priority, and urgency the Cognitive Engine determined. Where elegance and meaning conflict, meaning always wins. Formalised 2026-07-13 — see the dated entry below.

---

### 2026-07-13 — Narrative Fidelity formalised as a permanent principle
Every sentence the Narrative Layer produces must preserve the intent, priority, and urgency the Cognitive Engine already determined. Where there is tension between more elegant phrasing and exact preservation of meaning, preservation wins — every time, without exception.
**Why:** the Narrative Layer's entire justification (see "The Cognitive Engine decides, the LLM communicates") collapses if its output is allowed to drift from what was actually decided in the name of sounding better. This isn't a new constraint so much as making explicit what "the LLM communicates, it does not decide" already implied — but it's worth stating as its own principle because "sound more natural" and "preserve exact meaning" can trade off against each other in ordinary LLM phrasing tasks, and the product needs an unambiguous tiebreaker before that tension ever shows up in practice. This principle is also the standard the fabrication guard in `lib/narrative/validate.ts` is trying to approximate — it's the target, and the current heuristic (number/name checking) is a deliberately incomplete but honest proxy for it, not the definition itself.
**Cost if wrong:** none from stating it — this is a constraint on future prompt engineering and future validation work, not a code change today. It does commit us to revisiting `validate.ts` if a real fidelity failure (correct facts, drifted meaning) is ever observed in practice — accepted explicitly as future work, not a gap being ignored. Stronger narrative verification (e.g. a second LLM pass scoring the output against the input for fidelity, or constrained/structured generation rather than free-text rephrasing) is the natural next step if and when that happens — not a re-architecture, since it would slot into the same `validateNarrative` call in `generate.ts`.

### 2026-07-12 — Route Handlers over Server Actions for the Orchestrator boundary
API routes (`app/api/...`) call into `lib/brain`, not Next.js Server Actions.
**Why:** Increment 5 needs cron and (eventually) real events to trigger the same execution path a user action triggers today. A plain HTTP-shaped function signature stays callable from both; a Server Action is bound to a form submission in a way that would need re-wrapping later.
**Cost if wrong:** negligible — Route Handlers are marginally more boilerplate than Server Actions for a form. Cheap insurance.

### 2026-07-12 — `lib/brain/repository.ts` is the only module touching Business/Goal/Person persistence
No API route, page, or component imports `@/lib/prisma` directly for these entities.
**Why:** enforces "the Brain is the single source of truth" (Blueprint §3) as a real import boundary, not a convention people can forget.
**Cost if wrong:** none — this is close to free and catches drift early via code review / import linting later.

### 2026-07-12 — Onboarding goals use replace-not-patch semantics
`replaceGoals` deletes and recreates the full list on every save.
**Why:** goals are a short, infrequently-edited list during onboarding. Diffing individual goal edits is unnecessary complexity for a screen the owner visits once.
**Cost if wrong:** if goal editing becomes a frequent, granular, post-onboarding action, this will feel heavy-handed (full list re-submitted for a one-line edit). Revisit then — don't build the general case now.

### 2026-07-12 — Tenant isolation enforced at the application layer for Increment 1; Postgres RLS deferred to Increment 7
Every query is scoped through `ownerId` → `Business` lookups tied to the authenticated Supabase session. No RLS policies configured in Supabase yet.
**Why:** defense-in-depth (RLS) is real value, but sequencing it now would mean designing and testing RLS policies before we know the final shape of `Signal` access patterns (Increment 2+). Building it once, correctly, in the Hardening increment is simpler than building it twice.
**Cost if wrong:** a bug in application-layer scoping is exploitable until Increment 7 ships. Mitigated by keeping the scoping logic in one place (`lib/brain/repository.ts`) rather than scattered across routes.

### 2026-07-12 — Design tokens: ink / warm paper / brass, one accent
Rejected the default "cream + terracotta" and "near-black + neon" AI-app palettes in favour of an executive-ledger feel.
**Why:** Constitution Principle -1 — "we are building a Business Partner, not business software" — extends to visual register. A chatbot-coded palette undercuts that from the first screen.
**Cost if wrong:** pure aesthetic risk, cheap to revise; no architectural coupling to the token choice.

---

### 2026-07-12 — Signal identity uses provider-supplied `externalRef`, not database auto-increment alone
`Signal` gains a `externalRef` field, unique per `(businessId, externalRef)`. Every provider — seeded or live — must supply a stable, deterministic identifier for each signal it produces.
**Why:** this is what makes signal ingestion idempotent. A seeded provider re-run on the same day must not create duplicate signals; a live provider (e.g. Google Calendar) will naturally supply its own event ID as `externalRef`, so the same upsert logic works unchanged when providers are swapped. Without this, "replace the provider without changing anything downstream" (the whole point of Increment 2) would be false the moment persistence enters the picture.
**Cost if wrong:** if a future provider genuinely cannot supply a stable ID, it constructs one deterministically from its own payload (e.g. hash of type + timestamp + entity). Fallback is documented in the provider interface, not a schema change.

### 2026-07-12 — Signal generation is a callable pipeline, not yet the Executive Orchestrator
`lib/signals/pipeline.ts` exposes `generateSignalsForBusiness(businessId)`, invoked in this increment via a manual Route Handler (`POST /api/signals/generate`).
**Why:** Increment 2's job is to prove the Signal Provider seam, not to build the Executive Orchestrator (that's Increment 5, which will call this same pipeline function on a schedule instead of manually). Building the cron/orchestration wrapper now would be scope creep against the Blueprint's own milestone breakdown.
**Cost if wrong:** none — this function's signature (`businessId in, Signal[] persisted`) is exactly what Increment 5 needs to call; nothing here gets rebuilt, only re-triggered differently.

---

### 2026-07-13 — Sequencing change: Cognitive Engine v1 (Increment 3) built before completing all Signal Provider domains
The original plan (README, "Next: Increment 3") was to add seeded Tasks, CRM, and Finance/Proposals providers before the Cognitive Engine. That plan is superseded.
**Why:** the objective is to prove that Business Partner can reason its way to one genuinely useful recommendation — the core value proposition — not to accumulate signal variety. Two signal domains (Calendar, Email) are enough to build and validate the full Observe → Understand → Prioritise → Recommend pipeline end-to-end. Six disconnected signal sources without a reasoning layer over them would be a wider surface with nothing proven at the center.
**Cost if wrong:** none structurally — the `SignalInterpreter` seam (see below) means adding Tasks/CRM/Finance/Proposals interpreters later is additive, not a rebuild. The only cost is that the interpreter catalogue is thin (two domains) until those providers ship.

### 2026-07-13 — `SignalInterpreter`: one interpreter per (domain, type), registered centrally — the Understand/Prioritise seam
Mirrors `SignalProvider` (Increment 2) exactly. `interpretSignal(signal, context)` resolves the registered interpreter for a signal's `domain:type` key, or falls back to `interpretUnknown` (low confidence, low priority, never crashes, never invents meaning).
**Why:** the whole point of a vertical slice here is that Increment 4+ (Tasks, CRM, Finance, Proposals interpreters) means writing new interpreter files and registering them — `observe.ts`, `understand.ts`, `prioritise.ts`, and `recommend.ts` never change. Without this seam, every new signal type would mean touching the core pipeline logic, and the pipeline would slowly become an unreadable branch tree of `if (signal.domain === ...)`.
**Cost if wrong:** negligible. A wrong or missing interpreter degrades gracefully to the fallback (visibly low-confidence, not a crash) rather than corrupting a recommendation.

### 2026-07-13 — Deterministic, rule-based reasoning for v1 — no LLM call yet
Cognitive Engine v1 computes all five priority dimensions (business impact, urgency, strategic importance, confidence, owner preference) and all reasoning text from explicit, documented rules and templates — not a Claude API call.
**Why:** you asked for the recommendation engine to be "deterministic and explainable" before an LLM enters the loop. A rule that scores urgency as `daysSinceReceived / 5` or business impact as `0.85` for a first prospect meeting can be pointed to and argued with; an LLM's internal weighting cannot, at this stage, be inspected the same way. Proving the pipeline's shape (Observe → Understand → Prioritise → Recommend, fully traceable) is more valuable right now than proving the pipeline can call Claude — that's a swap-in, not a re-architecture, once this foundation is trusted.
**Cost if wrong:** the reasoning text reads more templated than a genuinely intelligent colleague would sound, and only Calendar/Email signal types are understood until more interpreters are written. Both are acceptable v1 costs; neither requires touching the pipeline itself to fix later — only adding interpreters, or replacing an interpreter's internals with a scoped Claude call whose output still populates the same `InterpretedSignal` shape.

### 2026-07-13 — Priority score weights are fixed constants, not learned or LLM-scored
`businessImpact 0.30 / urgency 0.30 / strategicImportance 0.20 / confidence 0.10 / ownerPreference 0.10`, documented inline in `prioritise.ts`.
**Why:** per the Cognitive Engine's Confidence Model and Constitution Principle 10 ("Business Partner never hides uncertainty" / "explains important recommendations"), a disagreement with the Engine's ranking needs to be traceable to one of five named numbers, not an opaque model output. `ownerPreference` is included as its own weighted term now, defaulted to neutral (0.5) for every insight, specifically so wiring in a real preference model later (Cognitive Engine Stage 9, "Refine") is a one-line change to how that one dimension is computed — not a re-architecture of the scoring formula.
**Cost if wrong:** the weights are a reasonable starting point, not a claim of optimality. Revisit once real owner feedback (accepted vs. edited vs. ignored recommendations) exists to tune against — Increment 8 territory (Cognitive Engine Stage 8/9, "Learn"/"Refine"), not now.

### 2026-07-13 — Supporting evidence includes more than the single winning signal
`recommend()` includes the winning signal plus any other prioritised insight concerning the same known person — e.g. an overdue email *and* an upcoming meeting with the same customer both appear as supporting evidence if the email wins.
**Why:** "why this matters" is a stronger, more trustworthy explanation when the owner can see the full picture of a relationship, not just the one signal that happened to score highest. This is also what "Supporting evidence (traceable back to the underlying signals)" in your Increment 3 brief implies — traceability to the full relevant context, not just a single ID.
**Cost if wrong:** none — if this proves too generous (pulls in unrelated noise) later, narrowing it to only the winning signal's own ID is a one-line change in `recommend.ts`.

### 2026-07-13 — `MorningBrief` schema extended with a `recommendedAction` field
Added alongside the existing `recommendation` (now used strictly as the one-sentence executive summary) and `reasoning` fields.
**Why:** the Increment 3 brief specifies five distinct components (executive summary, why this matters, recommended action, confidence, supporting evidence). The original schema had only `recommendation` and `reasoning`, which would have forced the executive summary and the concrete action into one ambiguous string. Splitting them means the UI (and any future channel — email digest, voice brief) can render each part appropriately.
**Cost if wrong:** a schema migration is needed (additive column, no data loss risk since no MorningBrief rows exist yet in any real deployment). Cheap now; would not be cheap after real recommendations existed in production.

### 2026-07-13 — Signal repository returns the typed domain shape, not raw Prisma rows
`getSignalsForBusiness` and the new `getSignalsByIds` now return `Signal[]` (with `relatedEntities.personId`) instead of raw Prisma rows (flat `personId`). `persistSignals` did this mapping internally already for its own return value; `pipeline.ts`'s manual re-mapping was removed in favour of using the repository's typed return directly.
**Why:** this was a latent inconsistency from Increment 2 — the domain `Signal` type (`lib/signals/types.ts`) and what `getSignalsForBusiness` actually returned had already diverged. The Cognitive Engine's Understand stage needs the typed shape to read `relatedEntities.personId`; fixing it at the repository (the one module allowed to know what a Signal row looks like) is more correct than adding a third ad hoc mapping at the call site.
**Cost if wrong:** none identified — `app/morning-brief/page.tsx`'s existing usage (`.domain`, `.occurredAt`, `.type`) is unaffected, since those fields exist identically in both shapes.

---

### 2026-07-13 — Executive Honesty: `Recommendation` replaced by a three-tier `MorningBriefResult` union; `recommend()` never returns null
`recommend()` (and `generateMorningBrief`, the renamed `generateRecommendation`) now always returns exactly one of `confident_recommendation` / `low_confidence_insight` / `all_clear` — never `null`.
**Why:** you asked for a principled floor under "no confident recommendation exists" — never an empty screen, never a fabricated directive. Modelling this as a discriminated union (rather than nullable fields bolted onto the old single `Recommendation` shape) means a `low_confidence_insight` literally cannot carry a `recommendedAction` at the type level — the compiler enforces the tier boundary that used to live only in a developer's head. `all_clear` was already implicitly reachable (Prioritise receiving an empty array), so this is a rename plus an explicit third state, not new control flow.
**Cost if wrong:** every consumer of the old `Recommendation` type needed updating in this same increment (repository persistence, both API routes, both UI components, all touching tests) — a one-time cost, paid now while there is no production data, per the same reasoning as the original `recommendedAction` field addition in Increment 3.

### 2026-07-13 — Confidence threshold for the recommendation tier is a named constant (`CONFIDENCE_THRESHOLD = 0.6`), not tuned per-interpreter
One threshold, defined once in `lib/cognition/types.ts`, applied uniformly to whatever insight wins Prioritise — not a per-interpreter or per-domain cutoff.
**Why:** the fallback interpreter's confidence (0.3) must never qualify; every registered interpreter's "unrecognised relationship" floor (0.7) comfortably should. 0.6 sits in the gap between those two real numbers rather than flush against either, so the boundary is defensible without needing to be exactly tuned yet. Keeping it as one constant (versus a per-interpreter cutoff) matches the existing Priority Score weights precedent (Increment 3) — a disagreement with the tier assignment traces to one named number, not five different ones.
**Cost if wrong:** revisit once real owner feedback exists on whether tier assignment matches their own sense of "this deserved a directive" (same Learn/Refine territory as the priority weights) — a one-line change, not a re-architecture.

### 2026-07-13 — `MorningBrief` persistence: tier-shaped fields are nullable; a `toRow`/`toResult` mapping pair is the only place that boundary is enforced
Extended the Prisma schema with `tier` and `message`; `recommendation`, `reasoning`, `recommendedAction`, and `confidence` all became nullable.
**Why:** the same reasoning as Increment 3's original schema decision — no `MorningBrief` rows exist in any real deployment yet, so a nullable-field migration costs nothing now and would cost a great deal once real data existed. `toRow`/`toResult` live in `lib/cognition/repository.ts` (the only module allowed to touch this table) specifically so "which fields exist for which tier" is decided in exactly one place, not re-derived at the API route, the page, and every test.
**Cost if wrong:** `toResult` throws on a row that violates its own tier's field requirements rather than silently returning a malformed object — a corrupt row surfaces as a loud error, not a UI that quietly renders `undefined`.

### 2026-07-13 — Introduced the LLM in a strictly constrained *communication* role — "the Cognitive Engine decides, the LLM communicates"
New `lib/narrative/` package. Pipeline: `Signals → Cognitive Engine (deterministic) → MorningBriefResult → Narrative Layer (LLM) → Morning Brief UI`. The Narrative Layer receives only a closed `NarrativeInput` (the already-decided executive summary, reasoning, action, confidence, and short signal summaries) and may only rephrase it into a `Narrative` (`headline` / `whyItMatters` / `actionText`). It cannot see Business Memory, raw Signals, or anything the Cognitive Engine didn't already decide.
**Why:** this is a permanent architectural principle, not a one-increment feature — see the Executive Intelligence Platform's own "Structured Outputs" and "Prompt Contracts" sections, which already anticipated exactly this split. Keeping reasoning fully deterministic and auditable (Increment 3) while still letting the *language* improve over time, without ever risking the trust a fabricated fact would cost, is a stronger position than either "no LLM" or "LLM decides everything."
**Cost if wrong:** none structurally — `NarrativeProvider` is a seam (mirrors `SignalProvider` / `SignalInterpreter` exactly), so a different model or a multi-provider ensemble later is a new file, never a change to `generate.ts`, `validate.ts`, or any caller.

### 2026-07-13 — Narrative generation runs at render time, not baked into `MorningBrief` persistence
`app/morning-brief/page.tsx` calls `generateNarrative()` fresh on every load; the persisted `MorningBrief` row only ever contains the deterministic Cognitive Engine output.
**Why:** decouples reasoning-time (Cognitive Engine, persisted, stable) from communication-time (Narrative Layer, ephemeral). An LLM provider outage never invalidates a historically stored brief, and a future prompt-contract version (`recommendation-narrative.v2`) improves the phrasing of old briefs automatically, with no backfill migration.
**Cost if wrong:** a narrative is regenerated (cost + latency) on every page view rather than cached. Acceptable for a single-owner MVP; if this becomes measurable, caching by `(morningBriefId, contractVersion)` is additive — it doesn't require moving generation back into the pipeline.

### 2026-07-13 — Narrative validation is a documented heuristic safety net, not a proof of faithfulness
`lib/narrative/validate.ts` rejects output that doesn't match the expected JSON shape, that supplies an `actionText` when the input carried none, that introduces a numeric token absent from the input, or that introduces a multi-word capitalised name (candidate proper noun) absent from the input. Single capitalised words are deliberately never checked — see the "no fabrication" test suite and inline comments.
**Why:** fully verifying that a rephrasing is faithful to its source is a much larger NLP problem than this increment should try to solve. The two failure modes an LLM is actually prone to here — inventing a number, inventing a name — are cheap to check for and catch the highest-cost mistakes. The raw, deterministic supporting-evidence list stays visible to the owner underneath every narrative (progressive disclosure UI), which is the structural backstop if a subtle fabrication ever slips past this heuristic.
**Cost if wrong:** a rephrasing that preserves every number and name but subtly changes meaning (e.g. softening "unanswered for 3 days" into "recently received") would pass validation undetected. Mitigated by the narrow scope of what the LLM is asked to do (rephrase, not summarize across multiple facts) and by the visible raw evidence; revisit if owner feedback surfaces this as a real problem.

### 2026-07-13 — Model choice for the Narrative Layer: a fast/cheap model, not the largest available
`claudeNarrativeProvider` calls `claude-haiku-4-5-20251001`.
**Why:** the task is narrow, closed-input phrasing — not reasoning — so cost and latency matter more than raw model capability here. Swappable behind `NarrativeProvider` with no caller changes if tone quality ever proves insufficient (Executive Intelligence Platform, "Model Selection is invisible to the user").
**Cost if wrong:** a one-line change in `providers/claude.ts` (or a new provider file entirely) — never a re-architecture.

### 2026-07-13 — "Today's agenda" (all-clear state) is read directly from raw Signals, not modelled as Cognitive Engine output
`AllClearCard`'s agenda is `signals.filter(domain === 'calendar' && isSameDay(today))`, computed in the page, independent of the Observe/Understand/Prioritise/Recommend cycle.
**Why:** the agenda is a display convenience ("what's already on the calendar today"), not a reasoned conclusion — it doesn't need scoring, interpretation, or traceability the way a recommendation does. Routing it through the Cognitive Engine would blur the boundary between "things Business Partner decided matter" and "things that are just true and already known."
**Cost if wrong:** none identified — this is presentation logic with no persistence or reasoning implications; if the agenda ever needs prioritisation (e.g. "which of today's 6 meetings matters most"), that's new Cognitive Engine scope, not a fix to this decision.
