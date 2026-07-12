# Architectural Decision Log

Concise, dated, traceable. Each entry: what we decided, why, and what it costs us if we're wrong. Superseded decisions are struck through, not deleted.

---

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
