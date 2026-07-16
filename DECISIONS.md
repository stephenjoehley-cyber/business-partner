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
8. **Confidence is a register, never a number, in owner-facing copy.** How confident Business Partner sounds is decided once, deterministically, from the Cognitive Engine's tier and confidence value (`confidenceRegisterFor`) — never phrased as a percentage, and never re-derived independently by the Narrative Layer or the UI. See 2026-07-13, "Confidence register is a deterministic Cognitive-Engine-shaped decision."
9. **Demo Mode is an adapter behind existing seams, never a second application.** Every repository module and the Supabase auth client check one function (`isDemoMode()`) and delegate to `lib/demo/` instead of Prisma/Supabase — production call sites, page code, and API routes never change. See 2026-07-13, Increment 5 entries below.

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

**2026-07-13 correction:** "Increment 7" above refers to the original Blueprint's milestone numbering, predating the approved SaaS Operating Model and Product Roadmap. The Increment 7 that was actually built (the Executive Orchestrator) did not touch RLS. RLS remains deferred — flagged, not scheduled — per Operating Model v1 §2, unchanged.

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

---

## recommendation-narrative.v2 — bringing the Morning Brief into compliance with the Executive Presence Specification (Asset 016) and Editorial Style Guide (Asset 017)

This stream's objective was not new functionality — it was making the existing Morning Brief unmistakably feel like advice from an exceptional AI Chief Operating Officer, per the two governing documents that now sit above the Narrative Prompt Contracts in the permanent hierarchy. A review of the Increment 4 implementation against those documents found several real violations, not just documentation gaps; all are fixed below.

### 2026-07-13 — `recommendation-narrative.v2`: the prompt contract is now a direct, section-by-section translation of the Editorial Style Guide
New file `lib/narrative/prompts/recommendation-narrative.v2.ts`. v1 is untouched, per its own header comment ("add a v2 file alongside, not in place of"). `claudeNarrativeProvider` now imports v2.
**Why:** Editorial Style Guide §8 names this exact gap — v1 "states its rules in its own words rather than pointing back to this document's" — and names `recommendation-narrative.v2` as "the natural, low-risk place to close it." The new system prompt is organised under the same section headers as the guide (Voice, Editorial Principles, Vocabulary, Confidence Language System, Narrative Patterns, Before/After) so a disagreement with the model's phrasing traces to a named editorial rule, not a prompt-engineering guess.
**Cost if wrong:** none structurally — same seam as v1 (`NarrativeProvider`), so a v3 contract if this one underperforms is a new file plus a one-line import change in `providers/claude.ts`.

### 2026-07-13 — Confidence register is a deterministic Cognitive-Engine-shaped decision, computed once, never phrased as a percentage
New file `lib/narrative/confidenceRegister.ts`: `confidenceRegisterFor(tier, confidence)` maps to one of four fixed registers (`confident_now` / `confident_soon` / `cautious` / `insufficient_evidence`) — verbatim from Editorial Style Guide §5. `NarrativeInput` gained a `confidenceRegister` field; `recommendation-narrative.v2` gives the model this register instead of a computed percentage (v1's `confidencePercent` field is gone). `MorningBriefCard` calls the same function for its own deterministic badge, so the LLM-generated copy and the always-available UI badge can never disagree about how confident this is.
**Why:** Editorial Style Guide §5 is explicit that "a percentage asks the owner to do arithmetic on trust," and §8 is explicit that "which register applies is a Cognitive Engine decision, passed in, never re-derived by the Narrative Layer." A single shared function is what makes "the LLM and the UI never disagree" true by construction rather than by convention — two independent implementations of "how confident does this sound" would have been a Narrative Fidelity violation waiting to happen.
**Cost if wrong:** the two new thresholds (`HIGH_CONFIDENCE_THRESHOLD = 0.8`, `INSUFFICIENT_EVIDENCE_THRESHOLD = 0.35`) are reasonable starting points chosen to cleanly separate the confidence values the registered interpreters actually produce (0.7–0.9) and to isolate the fallback interpreter's floor (0.3) into its own register — not a claim of optimality. Revisit alongside `CONFIDENCE_THRESHOLD` once real owner feedback exists (same Learn/Refine territory as the priority weights).

### 2026-07-13 — `validate.ts` now enforces Editorial Style Guide §4 (banned language) and §5 (no percentages) as hard validation failures, not just prompt instructions
New `assertNoBannedLanguage` check in `lib/narrative/validate.ts`, run alongside the existing fabrication guard. Rejects: banned engineering/marketing vocabulary (signal, payload, pipeline, interpreter, orchestrator, analyse, seamless, empower, etc. — the exact §4 list), any internal tier or register value leaking into copy (e.g. the literal string `confident_recommendation`), and any percentage (`\d+%`) regardless of whether it happens to be numerically accurate.
**Why:** a system prompt is an instruction, not a guarantee — Narrative Fidelity (the permanent principle above) already commits us to catching drift, and the Editorial Style Guide's own banned-language list is exactly the kind of thing a validation layer should enforce mechanically rather than hope the model remembers. This is the same philosophy as the existing fabrication guard: a heuristic safety net, not a proof of style compliance, but one that catches the specific, named failure modes the guide calls out.
**Cost if wrong:** banning every percentage outright is blunter than the guide's own wording ("never lead with a percentage as the primary way of communicating confidence" — implying percentages might be acceptable elsewhere, e.g. a genuine business fact like "a 40% deposit"). No current interpreter produces a percentage-shaped business fact, so this costs nothing today. Revisit this check specifically (not the whole validator) if a future interpreter surfaces a legitimate business percentage that a narrative would need to echo.

### 2026-07-13 — Raw domain/type and machine-precision timestamps removed from every owner-facing surface of the Morning Brief
`MorningBriefCard` and `AllClearCard` no longer render `signal.domain` / `signal.type` or `Date.toLocaleString()` directly. New `lib/signals/describe.ts` (`describeSignalPlainly`) gives every Signal domain a plain-English description; new `asOfPhrase` (`lib/ui/time.ts`) gives every generation timestamp a human phrase ("As of this morning" / "As of yesterday" / "As of 3 days ago"). Full machine precision is retained only in `title` attributes (hover disclosure), never the primary view. The `MorningBriefCard`'s "Confidence: 84%" label is gone, replaced by the same register phrase the Narrative Layer speaks in (see above); the exact percentage moved to a `title` tooltip.
**Why:** these are the exact violations Asset 016 names by pattern ("a raw system value shown where a sentence should be," "a percentage... presented as the primary signal of trust," "a timestamp precise enough to belong in a server log") and Asset 017 names by example ("Not this: `email_awaiting_reply_overdue` signal detected... Instead: An email from Jane Cooper has gone unanswered for 3 days"). This wasn't a documentation gap — the shipped `MorningBriefCard` and `AllClearCard` had exactly this pattern in their evidence-disclosure and today's-agenda lists.
**Cost if wrong:** the raw signal feed at the bottom of `app/morning-brief/page.tsx` ("Signals (raw feed)") is deliberately left untouched — it's explicitly labelled and scoped (Increment 2, "intentionally a raw preview, not a designed experience") as a separate developer-facing view, distinct from the advisory experience this stream is about. If that section is ever promoted into the real owner-facing product, it needs the same treatment; noted here so that's a deliberate future decision, not an oversight.

### 2026-07-13 — Fixed a real Executive Presence violation found during review, not introduced by this stream: the fallback interpreter's own text
`lib/cognition/interpreters/fallback.ts` (`interpretUnknown`) previously built its `summary`/`reasoning` from raw `signal.domain` / `signal.type` string interpolation, and literally contained the word "interpreter" — one of the words Editorial Style Guide §4 bans outright. Rewritten to use `describeSignalPlainly` for the summary and calm, register-appropriate language for the reasoning ("There isn't enough here yet to form a view...").
**Why:** this text isn't cosmetic — it becomes `executiveSummary`/`reasoning` on a real `MorningBriefResult` (tier `low_confidence_insight`) whenever an unrecognised signal is the highest-priority Insight, and `generate.ts`'s deterministic fallback uses those fields verbatim as `headline`/`whyItMatters` if the Narrative Layer is ever unavailable. The Morning Brief "must work perfectly with zero LLM calls" (permanent principle #4) — which means the Cognitive Engine's own strings must already be presentable on their own, not merely raw material for an LLM to clean up. This was the one place in the codebase where that wasn't true.
**Cost if wrong:** none identified — `dimensions` (confidence 0.3, low across the board) are unchanged, so this only affects the wording an owner would see in a corner case (an unrecognised signal type winning the low-confidence slot with the Narrative Layer down); it never affects which tier is assigned or whether this insight can win the recommendation slot.

### 2026-07-13 — `pluralDays` / `relativeDayPhrase` moved to `lib/shared/time.ts`; a new `relativeDatePhrase` added alongside them
Previously private to `lib/cognition/interpreters/util.ts`. That file now re-exports them from the new shared location so existing interpreter imports are unaffected.
**Why:** `lib/signals/describe.ts` (new) needed the same date-phrasing conventions and must not depend on `lib/cognition` (that would invert the intended dependency direction — Signals is a lower layer than Cognition). `lib/shared` is the neutral home for logic multiple layers need, matching Product Principle "reusable systems over one-off solutions" rather than duplicating the same two functions in a second file.
**Cost if wrong:** none — this is a pure relocation (same implementations, same signatures) plus one genuinely new function (`relativeDatePhrase`, which handles past dates — `relativeDayPhrase` only ever handled "today or later," which was fine for its original callers but not for describing a signal that already happened).

---

## Increment 5 — Zero-Configuration Founder Demo

Objective: `npm install && npm run dev` shows the complete, real Morning Brief experience with no Supabase project, no database migration, and no Anthropic API key. Not a second application — the same architecture, with Demo Mode adapters slotted behind the existing repository and auth seams.

### 2026-07-13 — `isDemoMode()` is the one decision point; auto-detects from Supabase config, overridable by one environment variable
New `lib/demo/config.ts`. Demo Mode is on when `NEXT_PUBLIC_DEMO_MODE=true`, or when no override is set and `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent (a fresh clone's default state). It's off when `NEXT_PUBLIC_DEMO_MODE=false` — the "one environment setting" the brief asks for.
**Why:** using only `NEXT_PUBLIC_`-prefixed variables means this exact function works identically from Server Components, Route Handlers, and Client Components (`lib/supabase/client.ts`) — Next.js inlines `NEXT_PUBLIC_*` into both bundles, so no prop-drilling is needed to tell a client component Demo Mode is active. Every other Demo Mode file (`lib/demo/store.ts`, `lib/demo/seed.ts`, `lib/demo/authStub.ts`, `middleware.ts`, every repository module) calls this one function rather than re-deriving the condition — the same "one place decides" discipline as `confidenceRegisterFor`.
**Cost if wrong:** `vitest.config.ts` now pins `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` to dummy values for the whole test suite — without this, every existing repository test would silently run against Demo Mode instead of the mocked-Prisma path they were written for, since a bare `vitest run` has no Supabase env configured. Demo-specific tests override this per-test with `vi.stubEnv`.

### 2026-07-13 — Demo Mode data lives in `lib/demo/store.ts`, an in-memory store scoped to one process lifetime — not a second database
Business/Goals/People are seeded synchronously at module load ("Meridian Gearboxes" / "Jane Cooper" — the same example already used in the interpreter tests and design documents, so the demo reads as a natural extension of the product's own worked examples rather than a disconnected fixture). Signals and Morning Briefs are populated by actually running the real pipelines once (`lib/demo/seed.ts`).
**Why:** a real (if disposable) database for Demo Mode would mean explaining a second persistence mechanism to reason about; an in-memory store scoped to the request process is simpler, requires no cleanup, and makes "resets on restart" an obviously correct property rather than a bug to manage. Every repository module (`lib/brain/repository.ts`, `lib/signals/repository.ts`, `lib/signals/config-repository.ts`, `lib/cognition/repository.ts`) checks `isDemoMode()` and delegates here instead of Prisma — same seam pattern as `SignalProvider`/`NarrativeProvider`, and the same "one module owns persistence" principle each of those repositories already followed for the real database. Production callers (API routes, Server Components) are completely unchanged.
**Cost if wrong:** demo data doesn't survive a server restart — acceptable and arguably correct for "open it and see it work," not a persistence guarantee. If a future need arises for a demo that *does* persist across restarts (e.g. a hosted public demo), that's an additive change to `lib/demo/store.ts`'s backing (e.g. a JSON file) — the repository call sites wouldn't change.

### 2026-07-13 — `ensureDemoSeeded()` runs the *real* Signal and Cognitive Engine pipelines once, rather than hand-authoring a signal list or a MorningBriefResult
New `lib/demo/seed.ts`. Calls `generateSignalsForBusiness` (`lib/signals/pipeline.ts`) and `generateMorningBrief` (`lib/cognition/pipeline.ts`) directly — the same functions a real business's cron cycle will call in Increment 6. Both are already Demo Mode-aware transitively, through the repository layer.
**Why:** the entire point of Demo Mode is to demonstrate the actual Signal Provider → Cognitive Engine → Narrative Layer architecture, not a parallel mock of its output. This also means the seeded Calendar/Email providers (Increment 2, already deterministic and business-context-aware) needed zero changes — they already produce plausible signals from a business + people context with no live integration, which is exactly what a zero-config demo needs.
**Cost if wrong:** the seeded providers' meeting/email counts are randomised (1–3) per their existing `dayKey`-seeded RNG, not pinned to exactly one each — "a calendar signal and an unanswered-email signal" is satisfied as a floor, not an exact count. Not fixed, since doing so would mean changing the shared seeded-provider logic non-demo callers also use, for a cosmetic guarantee the brief doesn't strictly require.

### 2026-07-13 — `lib/prisma.ts` guards against constructing a real `PrismaClient` while Demo Mode is active
Previously, `export const prisma = globalForPrisma.prisma ?? new PrismaClient();` ran unconditionally at module load. Now `isDemoMode()` is checked first; if active, `prisma` is a `Proxy` that throws a clear, named error the moment any property on it is accessed.
**Why:** "no database migrations" as a Demo Mode promise is only true if merely *importing* `lib/prisma.ts` (which every repository module does at the top of the file) can never require `DATABASE_URL`. Every repository function already checks `isDemoMode()` before touching `prisma`, so the Proxy is never touched in practice — it exists as a loud, immediate failure for a future function that forgets that check, rather than a confusing downstream Postgres connection error.
**Cost if wrong:** none identified — this is strictly additive safety; the non-demo path (`globalForPrisma.prisma ?? new PrismaClient()`) is byte-for-byte unchanged.

### 2026-07-13 — `lib/supabase/server.ts` / `lib/supabase/client.ts` return `demoAuthClient` in Demo Mode — same `createClient()` signature, zero call-site changes
New `lib/demo/authStub.ts` defines a minimal `AuthClient` interface (exactly the five methods this codebase's call sites use: `getUser`, `signOut`, `signInWithPassword`, `signUp`, `exchangeCodeForSession`) and `demoAuthClient`, a fixed demo user with no network calls. The real `SupabaseClient` already satisfies `AuthClient` structurally, so `createClient(): AuthClient` can return either without any caller needing to change.
**Why:** every page and API route already calls `createClient()` then `.auth.getUser()` — swapping the implementation behind the same function signature (the exact pattern this codebase already uses for `SignalProvider`/`NarrativeProvider`) means zero of those call sites needed to change, which is what "does not weaken or bypass the production architecture" requires in practice, not just in principle.
**Cost if wrong:** `signInWithPassword`/`signUp`/`exchangeCodeForSession` succeed unconditionally in Demo Mode, regardless of the credentials submitted. Not a security concern — `/login` and `/signup` are unreachable via normal navigation in Demo Mode (see the `middleware.ts` entry below), and there is no real account behind them to protect even if visited directly.

### 2026-07-13 — `middleware.ts` bypasses Supabase entirely in Demo Mode and redirects `/`, `/login`, `/signup`, `/onboarding` straight to `/morning-brief`
No Supabase client is constructed at all in the Demo Mode branch — not even the stub, since middleware doesn't need a user object, only a routing decision.
**Why:** this is what makes `app/page.tsx` and `app/onboarding/page.tsx` require **zero code changes** — middleware redirects before those pages ever render in Demo Mode. It also means a founder can never land on a sign-in form or the onboarding wizard while exploring the demo; there's a real seeded business, so onboarding would be a pointless detour from "see the Morning Brief," not a meaningful step.
**Cost if wrong:** `/api/onboarding/*` routes are deliberately *not* in the redirect list (they don't share the `/onboarding` page prefix) — they remain reachable and Demo Mode-functional, just unreachable via the normal demo UI flow, kept working for completeness rather than partially disabled.

### 2026-07-13 — The Morning Brief page is the only page that changed: seeds once, shows a Demo Mode banner and badge, otherwise identical
`app/morning-brief/page.tsx` calls `ensureDemoSeeded()` when `isDemoMode()`, and renders `DemoModeBanner`/`DemoModeBadge` (new, `app/morning-brief/DemoModeBanner.tsx`) in place of the ordinary header chrome. Every other rendering path (`MorningBriefCard`, `AllClearCard`, the empty state, the raw signal feed) is completely unmodified.
**Why:** "visibly labelled so it can never be mistaken for live data" — a full-width banner plus a header badge (where a founder's eye naturally goes looking for account state) is more visible than either alone, and both point at the same one-line explanation with the exact environment variable to flip if they want to leave Demo Mode.
**Cost if wrong:** none identified — purely additive rendering, gated on a boolean already computed once at the top of the page.

### 2026-07-13 — `replaceGoals` / `addPeople` return `Promise<void>` instead of the Prisma-inferred batch payload shape
Neither return value was ever used by its only caller (the onboarding API routes just `await` them). Explicit `void` return types replace the implicit Prisma `$transaction`/`createMany` result types.
**Why:** required to give the Demo Mode branch (which returns nothing meaningful either) a return type that matches without fighting Prisma's internal batch-payload shape. A side benefit: the Brain's public interface no longer leaks a Prisma-specific return shape for functions where that shape was never meaningful to begin with.
**Cost if wrong:** none identified — no caller anywhere in the codebase read these return values before this change.

---

## Increment 6 — Executive Presence Polish

Objective: remove everything that reminds the owner they're using software, strengthen everything that makes the experience feel like an exceptional Chief of Staff. Presentation only — the Cognitive Engine, Narrative Layer, and Signal pipeline are untouched. Preceded by a written Executive Presence Audit (`INCREMENT_6_AUDIT.md`) and an approved implementation plan, per Asset 018's Stage 1/2/3/4 process — this is the first increment run under that discipline rather than starting from code.

### 2026-07-13 — The raw signal feed is removed entirely, not redesigned (approved decision A)
`app/morning-brief/page.tsx`'s "Signals (raw feed)" section and its supporting `SignalPreviewPanel.tsx` component are deleted. `describeSignalPlainly`'s plain-English evidence disclosure inside `MorningBriefCard` is now the only way an owner explores the reasoning behind a recommendation.
**Why:** the audit found this section showing `signal.domain` and `signal.type.replaceAll('_', ' ')` — raw enum values, one lightly formatted — plus `signal.occurredAt.toLocaleString()`, a machine-precision timestamp. Both are named directly in Asset 017 §4 and Asset 016 Principle 5. The section's own code comment already anticipated this as Increment 2/3 scaffolding scoped for removal "when the real Morning Brief ships in Increment 6" — this isn't new debt, it's the debt this increment existed to close. Rather than reformat it to be compliant, it's removed outright: it would have duplicated evidence the recommendation card already discloses correctly, and a second evidence surface competes with the first (Asset 016 Principle 6, "One Thought At A Time").
**Cost if wrong:** a founder or stakeholder demo that got used to seeing the itemised raw feed loses that view. No functionality is lost — `getSignalsForBusiness` is still called (for `todaysAgenda` on the all-clear card) and every signal is still fully traceable through the evidence disclosure on a real recommendation.

### 2026-07-13 — `/api/signals/generate` is removed; signal refresh is folded into `/api/recommendations/generate`
The dedicated route and its manual "Refresh signals" trigger are deleted. `POST /api/recommendations/generate` now calls `generateSignalsForBusiness(business.id)` immediately before `generateMorningBrief(business.id)`, in one request.
**Why:** "signals" were never a concept an owner should need to hold in their head separately from "a recommendation" — the two-button UI (refresh signals, then prepare a brief) was an implementation detail of the Increment 2/3 architecture leaking into the experience. This composition is exactly what the Executive Orchestrator (Asset 014) will eventually do on a schedule — observe, then reason — so this is a step toward that architecture, not a detour from it. Neither `lib/signals/pipeline.ts` nor `lib/cognition/pipeline.ts` changed; this is a route-level composition only.
**Cost if wrong:** until the Orchestrator's scheduled pipeline exists, a real (non-demo) account has no way to refresh signals or regenerate a brief once one exists (see the next entry) other than this one combined action being available again — which it currently isn't, per approved decision C. This is a deliberate, named trade-off, not an oversight: Demo Mode is unaffected (`ensureDemoSeeded` calls both pipelines directly and doesn't go through this route), and a real account's first brief is unaffected. A real account's *second* brief, before the Orchestrator ships, is the gap — flagged here for Increment 7 planning.

### 2026-07-13 — `RecommendationTrigger` now renders only when no Morning Brief exists yet (approved decision C)
Previously rendered on every state (empty, all-clear, and confident/low-confidence recommendation) — three places the owner could see a button inviting them to manually re-run the reasoning engine, one of them sitting directly beside the answer it had already produced. Now renders only inside the `!latestBrief` branch of `app/morning-brief/page.tsx`.
**Why:** a manual "run the engine again" control next to an answer already given contradicts the Constitution's "Business software waits. Business Partners notice" and the First-Time User Experience's closing promise ("I've already started," never "you're ready to start"). An `all_clear` tier is a real Cognitive Engine conclusion, not an absence of one — so it gets the same treatment as a confident recommendation, not the treatment of the true empty state.
**Cost if wrong:** see the previous entry — this is the mechanism by which a real account currently loses the ability to manually refresh once a brief exists. Accepted as a deliberate trade-off pending the Executive Orchestrator (Increment 7 candidate).

### 2026-07-13 — Demo Mode banner no longer names an environment variable or tells the reader to "connect Supabase"
`app/morning-brief/DemoModeBanner.tsx` rewritten. Previous copy: "Connect Supabase and set `NEXT_PUBLIC_DEMO_MODE=false` to run against a real account." New copy states only that this is a demonstration and that it behaves like the real product would.
**Why:** named directly in the Increment 6 brief ("without exposing environment variables or implementation details") and Asset 016 Principle 3. Reconfiguring infrastructure is a developer task; it belongs in the README, not in front of an owner exploring the product.
**Cost if wrong:** none identified — a developer evaluating the demo still has the README and `DEMO.md` for setup instructions; nothing about running the project changed, only what's shown inside it.

### 2026-07-13 — Empty-state copy no longer says "executive cycle," and the Goals/People/Industry stat block is removed
`app/morning-brief/page.tsx`'s true-empty-state card previously read "Refresh your signals below, then run your first executive cycle" beside a `<dl>` of raw counts. Replaced with one sentence in judgement-first, owner-facing language.
**Why:** "executive cycle" is Cognitive Engine architecture vocabulary (Observe → Understand → Prioritise → Recommend), not owner language — Asset 017 §1. The stat block reported database counts without concluding anything from them, which is the "unnecessary information" the Increment 6 brief's Product Debt Review names directly.
**Cost if wrong:** none identified — the counts weren't referenced by any other component or test.

### 2026-07-13 — Monospace/uppercase-tracked typography for UI chrome is retained, not redesigned (approved decision B)
The audit flagged this pattern (header wordmark, evidence-disclosure labels, confidence register label, onboarding step numbers) as worth a Design System judgement call, without asserting a violation. Founder decision: retain it for this increment; no visual identity redesign as part of Executive Presence Polish.
**Why recorded here:** so a future contributor reading this file sees that the pattern was reviewed and deliberately kept, not overlooked.
**Cost if wrong:** none — no code changed as a result of this decision.

**Test/type status:** all 123 existing tests pass unchanged; no test referenced `SignalPreviewPanel`, the deleted `/api/signals/generate` route, or the raw feed markup. `npx tsc --noEmit` shows only the pre-existing, sandbox-only Prisma-client-generation errors already present before this increment (the sandbox's network allowlist blocks `binaries.prisma.sh`) — none reference any file changed in this increment.

## Increment 7 — Executive Orchestrator

Objective: a real (non-demo) business receives a new Morning Brief every day without any owner action, closing the exact gap flagged at the end of Increment 6. Preceded by an approved Product Audit and Implementation Plan — this increment implements exactly what those two documents scoped, nothing more.

### 2026-07-13 — `runDailyCycleForBusiness` (`lib/orchestrator/dailyCycle.ts`) is the one function every caller must use — no parallel reasoning paths
New module, the path the Blueprint (Asset 015 §3) already reserved for it. Wraps the two existing, unmodified pipeline functions (`generateSignalsForBusiness`, `generateMorningBrief`) with an idempotency check and failure isolation. Called identically from three places: the new cron route, the onboarding People step, and its own tests.
**Why:** per the Founder's explicit instruction, this function represents the daily executive cycle for a business, and every future caller — Calendar, Gmail, any later event-driven trigger — must converge on it rather than inventing a parallel path. Neither `generateSignalsForBusiness` nor `generateMorningBrief` changed at all; this is a wiring increment, not a reasoning increment, exactly as scoped in the audit.
**Cost if wrong:** if a future increment bypasses this function and calls the two pipelines directly, it silently loses both the idempotency guarantee and failure isolation — worth watching for in review, since nothing currently prevents that bypass except this comment and the code review process.

### 2026-07-13 — Idempotency implemented as a query (`hasMorningBriefToday`, `lib/cognition/repository.ts`), not a schema constraint
New function alongside `saveMorningBrief`/`getLatestMorningBrief`, in the same module that already owns all MorningBrief persistence. Checks for an existing row with `generatedAt` inside the current UTC calendar day — no migration required.
**Why:** Founder's product requirement was behavioural ("never two Morning Briefs for the same business on the same day"), explicitly leaving the mechanism as an implementation choice. A query-based check satisfies this without a schema change, matching the Blueprint's existing "single fixed UTC-based schedule" decision. Per the Founder's request, this is flagged as a comment at the check itself: a future database-level uniqueness constraint (e.g. a unique index on `(businessId, date)`) remains a valid hardening option if production requirements ever put this invariant under real pressure — not needed today.
**Cost if wrong:** a race condition (two near-simultaneous calls for the same business) could theoretically produce two briefs, since the check-then-act isn't atomic. Not a realistic risk for v1's one scheduled cron run per day plus one onboarding call, which are never concurrent for the same business in practice. If this ever becomes a real risk (e.g. concurrent manual triggers), the schema-constraint hardening option already flagged is the fix, not a redesign.

### 2026-07-13 — `getAllBusinessIds` (`lib/brain/repository.ts`) is deliberately unfiltered
New function, one line of real logic: `prisma.business.findMany({ select: { id: true } })`, demo-mode aware like every other function in this module (returns the single fixed seeded business id in Demo Mode).
**Why:** v1 has no per-business scheduling configuration (Operating Model §1 — one owner, one business, one schedule), so "which businesses should run today" is simply "every business that exists." Adding any filtering now would be building for a scheduling flexibility the product doesn't have yet.
**Cost if wrong:** none identified for v1's scale. Revisit only if/when v2's multiple-businesses-per-account model requires selective scheduling.

### 2026-07-13 — The scheduler route (`app/api/cron/daily-cycle/route.ts`) is authenticated by a shared secret, not a Supabase session — a genuinely different trust boundary from every other route
New route, `GET`, checks an `Authorization: Bearer $CRON_SECRET` header against the `CRON_SECRET` environment variable before doing anything else.
**Why:** a scheduled job has no user session to check — this is the first route in the codebase where that's true, so it can't reuse the existing auth pattern every other route follows. `GET`, not `POST`, because Vercel Cron (the scheduler named in `vercel.json`) invokes routes via `GET` and automatically attaches the `Authorization` header when `CRON_SECRET` is set.
**Cost if wrong:** if `CRON_SECRET` is ever unset in production, the route returns 401 for every request, including the real cron trigger — a loud, immediate failure (no Morning Briefs generated that day) rather than a silent security gap, since the check explicitly requires the env var to be present, not just absent from the request.

### 2026-07-13 — Onboarding's final step (`app/api/onboarding/people/route.ts`) calls `runDailyCycleForBusiness` synchronously, generating the inaugural Morning Brief before onboarding completes
One addition, after the existing `addPeople` call succeeds. No new code path — reuses the identical function the daily cron calls.
**Why:** Founder decision — a customer finishing onboarding and being told to wait until tomorrow would weaken the first experience; Business Partner should already be demonstrating value the moment onboarding ends, per Asset 005. Using the same function as the daily cycle (rather than a bespoke "first brief" path) is what "One Brain. One executive cycle. No special cases" means in practice.
**Cost if wrong:** the final onboarding step now takes as long as a full Observe → Reason cycle, rather than returning instantly — a deliberate trade the Founder explicitly accepted, and one the existing submit-button loading state already covers without new UI.

### 2026-07-13 — The manual `/api/recommendations/generate` route is left untouched
No change made to this route, deliberately.
**Why:** Founder decision — removing it now would solve a different problem than the one Increment 7 exists to solve. It becomes practically redundant for real accounts once the daily cycle is running (today's brief will already exist by the time anyone could click it), but whether it remains useful for diagnostics or founder workflows is a conscious future product decision, not a side effect of this increment.
**Cost if wrong:** none — this is strictly a decision not to act, not a functional change.

**Test/type status:** 135 tests passing (123 existing, unchanged, plus 12 new: 5 for `runDailyCycleForBusiness`, 3 for `hasMorningBriefToday`, 4 for `getAllBusinessIds`). `npx tsc --noEmit` shows only the same 15 pre-existing, sandbox-only Prisma-client-generation errors present before this increment — one new implicit-`any` error was found and fixed during implementation (an explicit parameter type on `getAllBusinessIds`' `.map` call, needed because the sandbox can't generate the Prisma client to infer it automatically).

## Production Truthfulness Correction

Objective: a real (non-Demo-Mode) business with no connected provider for a domain must never see fabricated meetings or emails. Surfaced directly by real production testing on 14 July 2026 — a real account's Morning Brief referenced a fabricated "Scope review" meeting, generated by the seeded Calendar provider's existing, correct-for-Demo-Mode behaviour of referencing real People on file. Deliberately scoped as a standalone correction, not bundled into the Google Calendar increment (Founder decision — Calendar should add customer value, not carry unrelated product debt).

### 2026-07-14 — `SignalProviderRegistry.getActiveProvider` no longer falls back to a seeded provider for real accounts
One method changed, in one file (`lib/signals/registry.ts`). Previously: `configuredId ?? DEFAULT_PROVIDER_ID[domain]`, unconditionally, for every business. Now: an explicit configuration is still always honoured regardless of mode; but when none exists, Demo Mode still defaults to the seeded provider (unchanged — Demo Mode has no UI to configure an override and is expected to show synthetic data), while a real account gets `null` — no provider, no signals, no invention. `fetchAllSignals` filters out `null` providers before calling `fetchSignals`, so a domain with nothing connected simply contributes zero signals rather than erroring.
**Why:** per Executive Honesty, fabricating specific-sounding external events (a named meeting, a person's name, a duration) for a real business with no live integration behind them is a trust violation, not a helpful placeholder — regardless of how well-intentioned the original seeded-provider design was for Demo Mode.
**Cost if wrong:** a real business with nothing connected now sees zero signals rather than plausible-looking ones — the Cognitive Engine's existing `all_clear` tier already handles this truthfully and gracefully; no new failure mode introduced. Google Calendar (Phase B, Item 5) begins against this corrected baseline: connecting a live provider raises a business out of `all_clear` with real data, not with fabricated data being replaced by real data.

**Test/type status:** 137 tests passing (135 existing, with `tests/signals/registry.test.ts` rewritten — 7 tests, up from 5, covering both Demo Mode's unchanged default and the real-account truthful-null behaviour explicitly). `npx tsc --noEmit` shows the same 15 pre-existing, sandbox-only Prisma-client-generation errors, unaffected by this change.

## Production Password-Reset Correction

Objective: a real production account must be able to complete password reset end-to-end. Surfaced directly by the first real end-to-end test of the feature on 15 July 2026 — every attempt failed with "Link no longer valid," across nine consecutive build/commit cycles, before the actual root cause was isolated. Recorded here in full, including the paths that did *not* fix it, per Asset 018 §6 (Handover Protocol) and the Founder's explicit instruction that a correct diagnosis matters more than a fast one.

### 2026-07-15 — `useSearchParams()` in `/auth/reset-password` wrapped in a `Suspense` boundary
`app/auth/reset-password/page.tsx` split into an inner `ResetPasswordForm` and a default-exported wrapper.
**Why:** Next.js cannot statically prerender a route that calls `useSearchParams()` outside a Suspense boundary — this was failing the production build outright (`next build` error, not caught by `tsc` or `vitest` alone, since neither exercises Next.js's static-generation step).
**Cost if wrong:** none identified — this is the standard, Next.js-documented fix for this exact build error, and the fallback UI shown during Suspense is a one-line "Checking your reset link…" message, not a new state to maintain.

### 2026-07-15 — `AuthClient` contract (`lib/demo/authStub.ts`) widened to include `setSession` and `getSession`
Two methods added to the hand-maintained interface and its Demo Mode stub, in two separate commits, as each was discovered missing.
**Why:** this interface is deliberately the *exact* list of Supabase auth methods any call site uses (see the file's own header comment) — `exchangeCodeForSession` and `resetPasswordForEmail`/`updateUser` were already present from earlier work, but `setSession` (needed for the older `#access_token=` link format) and later `getSession` (needed for the actual fix below) were genuinely new call sites this feature introduced.
**Cost if wrong:** none — these are pure type-contract additions with no behavioural change to the real Supabase client; the Demo Mode stub implementations are no-ops consistent with every other method in this file.

### 2026-07-15 — Middleware (`middleware.ts`) checks `isPublicPath` before creating a Supabase server client, not after
Reordered so public auth paths (`/login`, `/signup`, `/forgot-password`, `/auth/reset-password`, `/auth/callback`) return immediately, without calling `supabase.auth.getUser()` at all.
**Why:** public auth pages never need to know whether the visitor is logged in, so the previous unconditional `getUser()` call on every request was pure overhead on these paths — worth removing on its own merits (Product Principles, Principle 14: every feature must earn its place). Investigated as a candidate fix for the password-reset bug (a stale session cookie was a plausible trigger for an unwanted cookie refresh); testing after this change alone showed the bug was still present, so **this was not the root cause** — it is kept because it is independently correct, not because it fixed anything.
**Cost if wrong:** none — behaviour for protected paths is unchanged (`!user` still redirects to `/login`); this only removes a redundant network call on paths that never used its result.

### 2026-07-15 — `@supabase/ssr` upgraded from `0.5.1` to `0.12.3`
`package.json`/`package-lock.json` only; no application code changed. `@supabase/supabase-js` resolved automatically to `2.110.5` to satisfy the newer package's peer dependency, within the existing `^2.45.4` range already permitted by our own constraint.
**Why:** Supabase's own documentation attributes cookie/session-handling fixes to this version range, directly relevant to the bug being investigated. Tested in isolation after the upgrade; the identical failure persisted, so **this was not the root cause** either — kept because running seven minor versions behind a security-relevant auth library is worth correcting regardless of whether it fixed this specific bug.
**Cost if wrong:** none identified — full type-check and test suite passed unchanged after the upgrade, and both `middleware.ts` and `lib/supabase/server.ts` already used the current `getAll`/`setAll` cookie API, not a deprecated one, so no migration was needed.

### 2026-07-15 — Reset-password page no longer calls `exchangeCodeForSession`/`setSession` itself — the actual root cause and fix
`app/auth/reset-password/page.tsx`'s session-establishment logic replaced: instead of manually reading the `?code=` or `#access_token=` parameter and exchanging it, the page now calls `supabase.auth.getSession()` once and checks the result.
**Why:** the Supabase browser client (`createBrowserClient`) defaults `detectSessionInUrl` to `true`, meaning it automatically detects and exchanges a recovery link's code *at client-construction time* — before this page's own `useEffect` ever ran. The page's manual exchange call was therefore always racing the client's own automatic one for the same single-use code, and always lost, since the client's own exchange ran first. This is confirmed directly from the installed `@supabase/ssr` source (`createBrowserClient.js`), not inferred — and it explains why the identical error persisted across a library upgrade, a middleware change, and cleared browser cookies: none of those things were ever the actual cause. `getSession()` correctly waits for the client's own automatic detection to finish and simply reports the outcome, eliminating the race entirely rather than working around it.
**Cost if wrong:** none identified — verified with a clean, single-attempt, real end-to-end test (fresh reset request, immediate link click, single "Save new password" click) completing successfully, not just a retry after a first failure.

### 2026-07-15 — Consistent password-visibility toggle added across the Authentication feature family
New shared `components/PasswordField.tsx`, used identically by Login, Signup, and Reset-password in place of each page's own raw `<input type="password">`.
**Why:** per Asset 018 §5 (Feature Families) — a toggle added to only one of three password fields in the same feature family would be an inconsistency the founder correctly flagged before it shipped. One shared component, not three copies of the same toggle logic.
**Cost if wrong:** none — purely additive UI; no change to any submission logic on any of the three pages.

### 2026-07-15 — Reset-password's error state gained real actionable links, not just instructional text
The "Link no longer valid" screen's text used to say "Please request a new one" without actually linking anywhere. Now links directly to `/forgot-password` ("Request a new one") and `/login` ("Remembered it after all? Sign in"), matching the pattern already established on `/forgot-password` itself.
**Why:** Editorial Style Guide (Asset 017) §2 — "every recommendation ends somewhere the owner can act." An instruction with no way to act on it left the owner needing to already know the app's own URL structure.
**Cost if wrong:** none — additive navigation only.

**Test/type status:** 155 tests passing (153 existing at the start of this correction, plus 2 new covering `setSession`/`getSession` on `demoAuthClient`). `npx tsc --noEmit` shows only the same pre-existing, sandbox-only Prisma-client-generation errors present before this correction (the sandbox's network allowlist blocks `binaries.prisma.sh`) — none reference any file changed here. A full local `next build` could not be run in the sandbox (it also blocks `fonts.googleapis.com`); the Suspense-boundary fix was verified against Vercel's real production build instead, consistent with this project's standing practice of trusting real builds over sandbox approximations for anything the sandbox cannot fully exercise.

## Google Calendar — Attendee Resolution & Genuine First-Meeting Detection

Objective: close two gaps found during the Phase B Item 5 Founder Experience Review (15 July 2026) — a live Calendar signal never resolved its attendee to an existing Business Memory contact, and always reported `isFirstMeetingWithPerson: false` regardless of reality. Approved via Product Audit and Implementation Plan (Option B), following real end-to-end evidence, not a synthetic test.

### 2026-07-15 — `GoogleCalendarProvider` resolves `relatedEntities.personId` by matching attendee emails against existing `Person` records
`lib/signals/providers/google/calendar.ts`. Attendee emails (case-insensitive, trimmed) are matched against `context.people`, already passed into every `SignalProvider.fetchSignals` call per the existing `BusinessContext` contract. First match, in Google's returned attendee order, wins.
**Why:** the live provider never implemented this half of `CalendarSignalPayload`'s existing, already-defined contract — `relatedEntities.personId` was always empty, so the Cognitive Engine's interpreter (`lib/cognition/interpreters/calendar.ts`) could never recognise a known contact, regardless of whether one existed.
**Cost if wrong:** an event with several attendees who are all existing contacts links to only the first match found — a declared, schema-level limitation (`RelatedEntities.personId` is a single field), not an oversight. Multi-person linkage would need a `RelatedEntities` schema change, out of scope here.

### 2026-07-15 — `GoogleCalendarProvider` computes a genuine `isFirstMeetingWithPerson`, replacing the hardcoded `false`
New repository function `hasPriorInteractionForPerson` (`lib/signals/repository.ts`), deliberately generic across `domain`/`type` rather than Calendar-specific (CPO naming recommendation) so Gmail and future interaction domains can reuse it without redesign. A matched `Person` is "first meeting" only if no earlier persisted signal already connects the two; an attendee with no matched `Person` at all is trivially a first meeting, since there is no record to check against.
**Why:** considered and rejected moving this logic into the shared Cognitive Engine interpreter instead (Option A) — the Founder's own reasoning: Signal Providers observe and normalise; the Cognitive Engine understands and judges. Computing this inside the interpreter would have made a shared code path (used by every calendar signal, seeded and live) depend on live-provider-specific historical reasoning, at real risk to Demo Mode's deliberately hand-tuned seeded scenarios. Option B keeps the change contained to one file, consistent with `CalendarSignalPayload` already being provider-supplied, per-domain data (MVP Blueprint §5).
**Cost if wrong:** if Option A is later judged correct after all, this becomes a refactor — moving already-correct logic from provider to interpreter — not a redesign; the underlying data (`Signal.personId`, the historical query) doesn't change.

### 2026-07-15 — Same-batch blind spot in first-meeting detection, found during real end-to-end testing, fixed same day
Found directly by the Founder deliberately creating two real test meetings with the same attendee in the same fetch window: both were marked "first meeting," because the historical check only looked at signals already persisted from a *previous* run — it had no visibility into sibling events being processed in the same batch. `GoogleCalendarProvider.fetchSignals` now processes events sequentially, in the chronological order Google already returns them in (`orderBy=startTime`), tracking which people have already been seen earlier in the same batch.
**Why:** the original implementation used `Promise.all` over all events, computing each `isFirstMeetingWithPerson` independently and concurrently — correct against the database, blind to concurrent siblings.
**Cost if wrong:** none identified — verified directly against the real scenario that exposed it (two real Calendar events, same attendee, same fetch), not just a synthetic test.

**Test/type status:** 167 tests passing (155 before this work; 12 new — 6 in `tests/signals/providers/google/calendar.test.ts` covering attendee matching, first-meeting detection, and the same-batch regression; 5 in `tests/signals/repository.test.ts` covering `hasPriorInteractionForPerson` directly, both real and Demo Mode branches; 1 additional regression test added after the same-batch fix). 5 pre-existing, sandbox-only failures in `tests/demo/repositoryIntegration.test.ts` remain, confirmed unrelated by re-running the identical suite against unmodified `main`. `npx tsc --noEmit` shows 19 errors, all the same pre-existing, sandbox-only Prisma-client-generation category as before (17 baseline + 2 new, both "no exported member 'Person'" in the two files that now import it directly) — none reference genuine logic in the files changed here.

## Personal Greeting (Preferred Name)

Objective: greet the person using Business Partner, not the business they work for — Founder + CPO decision, 2026-07-15, reasoned directly from the Constitution and Executive Presence Specification's "exceptional colleague" standard, and from the Operating Model's future multi-user roadmap (§1, v3): a business-name greeting is already impersonal and becomes actively wrong once more than one person can share a business workspace.

### 2026-07-15 — Signup captures a single "Preferred Name" field, stored in Supabase `user_metadata`
`app/(auth)/signup/page.tsx`. Deliberately one free-text field ("What would you like Business Partner to call you?"), not separate first/last name fields (CPO recommendation) — avoids assumptions about global naming conventions and scales internationally without new identity fields. No database schema change: Supabase's existing `user_metadata` mechanism carries it.
**Why:** the smallest-footprint way to capture this — no Prisma migration, no new table, nothing to backfill.
**Cost if wrong:** none identified for new signups. Every account that signed up before this field existed (including the Founder's own test accounts) has no way to set one retroactively — a real, declared limitation, not an oversight (see Decision Backlog Q9).

### 2026-07-15 — Morning Brief greets by Preferred Name, falling back to the business name
`app/morning-brief/page.tsx`. Greeting priority: Preferred Name (from `user.user_metadata`) → business name, unchanged from today's existing behaviour, if no Preferred Name is on file.
**Why:** graceful fallback means every existing account — and Demo Mode's stubbed user, which has no `user_metadata` at all — keeps exactly today's behaviour with zero migration required, while every new signup gets the more personal experience immediately.
**Cost if wrong:** none identified — verified directly with a real, live throwaway signup (Preferred Name "Essjay"), confirmed the Morning Brief read "Good afternoon, Essjay."

### 2026-07-15 — `AuthClient` (`lib/demo/authStub.ts`) widened to expose `user_metadata` and `signUp`'s `data` option
Two fields added to the shared interface Demo Mode and the real Supabase client both conform to, following the exact pattern already used for `setSession`/`getSession` (Production Password-Reset Correction, same file).
**Why:** the interface is deliberately the exact list of Supabase auth surface any call site uses; Preferred Name introduced two genuinely new call sites (`getUser().data.user.user_metadata`, `signUp()`'s `options.data`).
**Cost if wrong:** none — pure type-contract additions; Demo Mode's stub already ignores its `signUp` parameters entirely, so no behavioural change there.

**Test/type status:** 167 tests passing, unchanged from the Calendar work above — no new tests added for this change; existing `tests/demo/authStub.test.ts` (7 tests) re-verified passing after the interface widening. `npx tsc --noEmit` shows no new errors beyond the same 19 pre-existing, sandbox-only category.
## Phase B Item 6 — Business Memory Persistence Verification

Objective: verify Operating Model §7's five Business Memory commitments against the actual codebase, per the Roadmap's own framing of this item ("largely already built... verification, not new design"). Found: three of four verified cleanly; one governing document overstated reality rather than the product having a real gap.

### 2026-07-15 — Verified: Creation, Enrichment, Isolation
`lib/brain/repository.ts`, `lib/signals/repository.ts` reviewed directly. Every real (non-Demo-Mode) query scoped by `ownerId` or `businessId`; the one deliberately unscoped function (`getAllBusinessIds`) is documented and doesn't leak data — it only returns IDs, re-scoped by every subsequent call. Creation confirmed live via the same-day Personal Greeting throwaway signup test — a genuine, unplanned end-to-end run of this exact commitment.
**Why:** direct code review plus one real production test, rather than re-reading the Roadmap's own description and assuming it still matched reality.
**Cost if wrong:** none — nothing changed; this is a verification record.

### 2026-07-15 — Governance correction: Operating Model §11's "Full data deletion/export on request" checkmark corrected
Prisma schema fully supports deletion (`onDelete: Cascade` throughout), but no application feature — route, UI, or function — exists to delete or export a business's data. Founder decision: correct the Operating Model's checkmark to reflect reality rather than expand this Roadmap item to build the feature now. Deletion/export is scheduled deliberately before first commercial release (Decision Backlog Q11), not silently deferred.
**Why:** "I'd rather have an unchecked box than an inaccurate checkmark" (Founder, 2026-07-15) — truthfulness applies to governing documents themselves, not only to what Business Partner tells an owner.
**Cost if wrong:** none identified — no commercial customer exists yet for whom this commitment is currently being relied upon.

### 2026-07-15 — Migration strategy question logged, not resolved from code
No `prisma/migrations` directory exists in the repository, and no evidence of how `schema.prisma` changes have reached the live production database (`prisma migrate` vs. `db push`). This is a factual question only the Founder can answer from actual deployment history — logged as Decision Backlog Q10, not blocking this item's closure.
**Why:** cannot be verified from the code alone; recording the open question rather than guessing.
**Cost if wrong:** none — informational only.

**Status:** Phase B, Item 6 closed. No code changed as part of this item; the one real finding was a governance document correction, not an implementation gap.

## Prisma Migrate Adoption (Decision Backlog Q10, resolved)

Objective: resolve Q10 — no `prisma/migrations` directory existed, and no record of how `schema.prisma` had reached production (`prisma migrate` vs `db push`). Founder confirmed via direct terminal work in a GitHub Codespace: production had real data but no migration history.

### 2026-07-16 — Baselined production via `prisma migrate resolve --applied`, not `db push`
`prisma/migrations/0_baseline/migration.sql` generated by diffing the live production schema directly (`prisma db pull`), then marked as already-applied against production without re-running it. `prisma migrate deploy` is now the standing process for all future schema changes.
**Why:** `db push` has no migration history and no forward audit trail; a real SaaS company needs `prisma migrate deploy` in CI/CD from here on. Baselining from an empty migration history onto an existing production database is Prisma's documented path for exactly this situation.
**Cost if wrong:** none identified — the baseline migration was diffed directly against live production before being marked applied, not assumed from `schema.prisma` alone.

### 2026-07-16 — Schema-hygiene corrections folded into the baseline, not left as drift
Direct introspection (`prisma db pull`) surfaced two pre-existing mismatches between `schema.prisma` and production: `MorningBrief.supportingSignalIds` was missing `@default([])`, and six foreign keys were missing explicit `onUpdate: NoAction` (one also missing `onDelete: NoAction`). Both corrected in the same commit, before baselining.
**Why:** verified directly in `lib/cognition/repository.ts` that every `MorningBrief` creation path already explicitly supplies `supportingSignalIds` — the missing default was zero production risk, not a live bug. Correcting it now means the baseline migration reflects the schema Business Partner is actually meant to have, rather than baselining known drift.
**Cost if wrong:** none identified — no application code relied on the previous (incorrect) absence of these constraints.

### 2026-07-16 — `Business.onboardingCompletedAt` added ahead of Item 7's application code
Added in the same migration as the baseline, `DateTime?`, nullable. Landed alongside the schema-hygiene fixes rather than as its own migration, since both needed the same baseline pass.
**Why:** Item 7 (same day) needed this field to gate onboarding completion on genuine Morning Brief generation rather than form submission; adding it here avoided a second migration immediately after the first.
**Cost if wrong:** none identified — nullable field, no backfill required, every existing business simply has `null` until they complete onboarding under the new logic.

**Test/type status:** no test changes in this commit — schema and migration files only.

## Phase B Item 7 — Onboarding Completion Gating

Objective: gate `onboardingCompletedAt` on the inaugural Morning Brief genuinely being generated, not on form submission — Founder-specified sequence: Business Profile → Goals → People → `runDailyCycleForBusiness` succeeds → `onboardingCompletedAt` set → redirect. Also fixed two real bugs found during this work.

### 2026-07-16 — New `POST /api/onboarding/complete` route, separate from People submission
`app/api/onboarding/complete/route.ts`. Calls `runDailyCycleForBusiness`, and only calls `completeOnboarding` if it succeeds (or has already run today, e.g. a retried call). Deliberately its own endpoint, not folded into `/api/onboarding/people`.
**Why:** keeps a brief-generation failure retryable on its own — the owner is never at risk of resubmitting (and duplicating) People just to retry this step. Idempotent by construction: `runDailyCycleForBusiness` already no-ops for an existing same-day brief, and `completeOnboarding` only ever advances `onboardingCompletedAt` forward.
**Cost if wrong:** none identified — a failed call leaves the owner correctly still in the wizard; nothing is marked complete on a real failure.

### 2026-07-16 — Completion check changed from `goals.length > 0` to `onboardingCompletedAt`
`app/onboarding/page.tsx`. The old check permanently skipped the optional People step for anyone who reached Goals but abandoned before People, since it only checked for the presence of Goals.
**Why:** People is deliberately optional (existing product decision) — but "optional" should mean "the owner can choose to skip it," not "any abandonment before this step silently and permanently removes it." `onboardingCompletedAt` is only set after the full sequence succeeds, so it's the only accurate signal that onboarding genuinely finished.
**Cost if wrong:** none identified — verified directly against the new field's semantics; no existing business had `onboardingCompletedAt` set incorrectly, since the field didn't exist until this same day's baseline migration.

### 2026-07-16 — Validation error messages now reach the owner (bug fix)
`app/onboarding/OnboardingWizard.tsx`. The client read only `data.error.formErrors`, but Zod's `.flatten()` puts field-level messages under `fieldErrors` — meaning specific, already-written validation messages never reached the owner; they saw only the generic fallback.
**Why:** genuine bug, not a design gap — the server was already producing the right message, the client was reading the wrong field.
**Cost if wrong:** none identified — this is a strict improvement; the fallback message is preserved for any error shape not covered by the more specific reads.

### 2026-07-16 — Session-expiry recovery: 401 responses now offer a direct sign-in action
`app/onboarding/OnboardingWizard.tsx`. A `401` from any onboarding step now surfaces `{ message, actionHref: '/login', actionLabel: 'Sign in again' }` instead of a generic error with no path forward.
**Why:** a mid-onboarding session expiry previously left the owner stuck with a dead-end error and no indication that signing in again would fix it.
**Cost if wrong:** none identified — additive; every other error shape falls through to the previous generic message unchanged.

**Test/type status:** 174 tests passing (167 before this work; new coverage added in `tests/api/onboarding/complete.test.ts` and `tests/brain/repository.test.ts` for the new route and `completeOnboarding`). `npx tsc --noEmit` unchanged from the pre-existing sandbox-only Prisma-client-generation category.

## Google Calendar OAuth Fix (Decision Backlog Q16, resolved)

Objective: fix Google Calendar connection failing in production with `/settings?calendar=error`, discovered during a genuine fresh-account onboarding test (16 July 2026).

### 2026-07-16 — `getGoogleAuthUrl` now requests `prompt: 'consent'`
`lib/signals/providers/google/oauth.ts`. Root cause: Google only issues a `refresh_token` the first time a given Google account grants an app consent. The Founder's account had already authorized this app in an earlier test; when that test's Supabase user (and its cascaded business record, including the saved refresh token) was deleted and a fresh business was created under the same Google account, Google's subsequent authorization returned an access token but no refresh token — and the callback correctly, but unhelpfully, treated that as a failure (`if (!tokens.refreshToken && !existingRefreshToken)`). Diagnosed directly from the callback's own logic and confirmed against the exact sequence of events (delete → recreate → reconnect with the same, already-authorized Google account), not guessed.
**Why:** `prompt: 'consent'` forces Google to show the consent screen and issue a fresh refresh token on every authorization, regardless of prior grants — the standard fix for this well-documented Google OAuth behavior. No change to scopes, credentials, or redirect URI was needed; this was never a configuration/drift problem.
**Cost if wrong:** none identified — the owner now sees Google's consent screen on every connection attempt, including reconnections. This is a minor, expected UX step (one extra click confirming access), not a functional risk.

**Test/type status:** 178 tests passing (174 before this work; 4 new in `tests/signals/providers/google/oauth.test.ts`, covering the `prompt=consent` param, `access_type=offline`, state passthrough, and the missing-env-var error).
