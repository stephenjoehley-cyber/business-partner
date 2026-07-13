# Business Partner

The AI Chief Operating Officer for SMEs. This repo implements, in order:

- **Increment 1 — Business Brain Foundation**
- **Increment 2 — Signal Provider Abstraction**
- **Increment 3 — Cognitive Engine v1**
- **Increment 4 — Morning Brief Experience**
- **Increment 5 — Zero-Configuration Founder Demo**

per `Business_Partner_MVP_Blueprint_v1.0.md`. See `DECISIONS.md` for the traceable log of why things are built the way they are — including the Increment 3 sequencing change (Cognitive Engine before completing all Signal Provider domains) and the Increment 4 architectural principle: **the Cognitive Engine decides, the LLM communicates.**

## What's in Increment 1

- Supabase authentication (email/password + email confirmation callback)
- Prisma schema for the Business Brain (Business, Goal, Person)
- A three-step onboarding flow: business profile → goals/priorities → key people
- Application-layer tenant isolation (one `Business` per authenticated owner)
- A design system (tokens in `tailwind.config.ts` / `app/globals.css`) distinct from generic AI-app defaults: ink, warm paper, and a single brass accent

## What's in Increment 2

- **Signal domain model** (`lib/signals/types.ts`) — the atomic unit the Cognitive Engine will reason over, with per-domain payload shapes (Calendar, Email, Tasks, CRM, Finance, Proposals)
- **`SignalProvider` interface** (`lib/signals/provider.ts`) — the seam every provider, seeded or live, must implement
- **`SignalProviderRegistry`** (`lib/signals/registry.ts`) — resolves the active provider per business, per domain, defaulting to seeded providers when no config exists
- **Seeded Calendar and Email providers** — produce plausible, business-specific signals (preferring real People on file over generic filler), deterministically seeded per business per day
- **Idempotent Signal persistence** (`lib/signals/repository.ts`) — upserts keyed on `(businessId, externalRef)`, so re-running generation never duplicates, and a future live provider's own event IDs slot into the same mechanism unchanged
- **A callable generation pipeline** (`lib/signals/pipeline.ts`) — `generateSignalsForBusiness(businessId)`, the exact function signature Increment 5's Executive Orchestrator will call on a schedule instead of the manual trigger used today
- A raw signal preview on the Morning Brief screen, honestly labeled as a stand-in for the real Cognitive Engine output that ships in Increment 6

## What's deliberately not in this increment

No Cognitive Engine, no Executive Orchestrator, no scheduling, no live integrations, no Tasks/CRM/Finance/Proposals providers yet. The Morning Brief screen still shows raw signals rather than a reasoned recommendation — that reasoning is Increment 3's job.

## What's in Increment 3

The Cognitive Engine's first real reasoning cycle: **Observe → Understand → Prioritise → Recommend**, producing one genuine executive recommendation from existing Calendar and Email signals.

- **`lib/cognition/observe.ts`** — scopes signals to what's still current (drops calendar meetings already in the past; never time-filters email, since an unanswered message stays relevant)
- **`lib/cognition/understand.ts`** — connects each signal to Business Memory via a registered `SignalInterpreter`, producing a plain-language `Insight`
- **`lib/cognition/interpreters/`** — the domain-specific reasoning seam (mirrors `SignalProvider` exactly): one interpreter per `(domain, type)`, each computing the five priority dimensions, a "why this matters" reasoning string, and a concrete recommended action. Ships with Email and Calendar interpreters, plus a fallback for any signal type without one yet (low confidence, never crashes, never invents meaning)
- **`lib/cognition/prioritise.ts`** — the documented, fixed-weight composite scoring formula (business impact 0.30 / urgency 0.30 / strategic importance 0.20 / confidence 0.10 / owner preference 0.10)
- **`lib/cognition/recommend.ts`** — selects the single highest-priority insight and builds the traceable `Recommendation`, with supporting evidence pulled from every other signal concerning the same known person
- **`lib/cognition/pipeline.ts`** — `generateRecommendation(businessId)`, the exact function signature Increment 5's Executive Orchestrator will call on a schedule instead of the manual trigger used today
- **`MorningBrief` persistence** (`lib/cognition/repository.ts`) — every recommendation is saved with its executive summary, reasoning, recommended action, confidence, and `supportingSignalIds`
- The Morning Brief screen now shows the Cognitive Engine's one recommendation as its primary artifact — executive summary, why it matters, recommended next action, a confidence indicator, and the supporting signals it was traced back to — falling back to the honest empty state when no recommendation has been generated yet
- 25 new Vitest tests (52 total) covering every pipeline stage, all registered interpreters, the fallback path, and the pipeline end-to-end

## What's deliberately not in this increment (Increment 3)

No Executive Orchestrator or scheduling (Increment 5) — the pipeline runs on a manual trigger. No Tasks/CRM/Finance/Proposals signal types or interpreters yet — the interpreter registry is built to accept them without any change to the pipeline itself. No LLM call in the reasoning path — v1 is deliberately deterministic and rule-based so the pipeline's shape can be trusted and audited before a non-deterministic reasoner enters it (see DECISIONS.md).

## What's in Increment 4

The first genuinely compelling Morning Brief experience, built around a single primary artifact — never a dashboard.

- **Executive Honesty (`lib/cognition/types.ts`, `recommend.ts`)** — `recommend()` now always returns exactly one of three tiers, never `null`: `confident_recommendation` (the winning insight cleared `CONFIDENCE_THRESHOLD`), `low_confidence_insight` (there's a highest-priority insight, but the Engine isn't confident enough to direct action from it — presented informationally, never as a directive), or `all_clear` (nothing to reason over). "Nothing urgent" is always presented as useful information, never as silence or an error.
- **The Narrative Layer (`lib/narrative/`)** — a new architectural principle: **the Cognitive Engine decides, the LLM communicates.** Pipeline: `Signals → Cognitive Engine (deterministic) → MorningBriefResult → Narrative Layer (LLM) → UI`. The LLM (`claude-haiku-4-5-20251001`, swappable behind the `NarrativeProvider` seam) receives a closed `NarrativeInput` — only the already-decided executive summary, reasoning, action, confidence, and short signal summaries — and may only rephrase them into a `headline` / `whyItMatters` / `actionText`. It cannot add a fact, change the recommendation, or alter the confidence. Output is validated (shape + a fabrication guard against invented numbers/names) and generation always falls back to the Cognitive Engine's own deterministic strings on any failure — network error, timeout, malformed output, or a failed validation — so the Morning Brief works perfectly with zero LLM calls.
- **Versioned prompt contract (`lib/narrative/prompts/recommendation-narrative.v1.ts`)** — the system/user prompt is a version-controlled file, not an inline string; a future `v2` is a new file, not an edit.
- **`MorningBrief` persistence extended** (`lib/cognition/repository.ts`, `prisma/schema.prisma`) — `tier` and `message` columns added; the recommendation-shaped fields are now nullable, since which fields exist depends on the tier. A `toRow`/`toResult` mapping pair is the only place that boundary is enforced.
- **The Morning Brief screen redesigned around one hero artifact**: an executive greeting, the single recommendation (or honest low-confidence insight, or a calm all-clear with today's agenda), why it matters, the recommended action (confident tier only), a confidence indicator, and progressive disclosure — one or two related observations shown inline, the complete traceable signal list one click away in a "View supporting evidence" disclosure. No additional widgets.
- 25 new Vitest tests (77 total) covering the tiered `recommend()`/`generateMorningBrief()` behaviour, tiered persistence and its row-mapping, the Narrative Layer's validation and fabrication guard, its graceful-degradation orchestration, and the small presentation-only time helpers.

## What's deliberately not in this increment (Increment 4)

No Executive Orchestrator or scheduling (Increment 5) — still a manual trigger. No caching of generated narratives (regenerated on every page view — see DECISIONS.md). No multi-provider narrative ensemble or model fallback chain — one `NarrativeProvider` implementation, swappable but not yet swapped. No Tasks/CRM/Finance/Proposals interpreters yet.

## Getting started

### 1. Create a Supabase project
Create a project at supabase.com. From **Settings → API**, copy the URL and anon key. From **Settings → Database**, copy the pooled connection string (`DATABASE_URL`) and the direct connection string (`DIRECT_URL`, used for migrations).

### 2. Configure environment
```bash
cp .env.example .env
# fill in the four values
```

Increment 4 adds one more, optional variable: `ANTHROPIC_API_KEY`, used by the Narrative Layer (`lib/narrative/`) to phrase the Morning Brief's language. It is genuinely optional — if it's unset, missing, or the API call fails for any reason, the Morning Brief falls back to the Cognitive Engine's own deterministic strings and works identically from the owner's point of view.

### 3. Install and migrate
```bash
npm install
npm run db:migrate   # creates the initial migration and applies it
npm run db:generate  # regenerates the Prisma client (also run automatically by db:migrate)
```

### 4. Run
```bash
npm run dev
```
Visit `http://localhost:3000`. Sign up, complete onboarding, and you'll land on the Morning Brief placeholder.

### 5. Test
```bash
npm test
```

## A note on this sandbox build

This project was scaffolded and type-checked in a network-restricted sandbox that cannot reach `binaries.prisma.sh` (Prisma's engine CDN) or Google Fonts, so `prisma generate` and `next build` couldn't be fully run here — the only type errors present are the resulting missing `@prisma/client` exports, and the only build failure is the font fetch. Everything else type-checks cleanly and the Vitest suite passes (77/77 as of Increment 4). In a normal dev machine, CI runner, or Vercel build (all of which have unrestricted internet access), `npm install` → `npm run db:migrate` resolves the Prisma gap immediately, and `next build` fetches fonts normally.

## Architectural decisions worth flagging

- **`lib/brain/repository.ts` is the only module that touches Business/Goal/Person persistence.** API routes never call Prisma directly — this is the enforcement point for "the Brain is the single source of truth" (Blueprint §3, §4).
- **Onboarding goals use replace-not-patch semantics** (`replaceGoals` deletes and recreates the full list). This is the simplest correct behaviour for a short, infrequently-edited list; revisit only if granular goal editing becomes a frequent action post-MVP.
- **The People step is skippable.** Per the Product Principles ("no twenty-field questionnaires," "no unnecessary friction"), nothing in onboarding is mandatory beyond business name and industry.
- **RLS is not yet configured in Supabase directly** — tenant isolation in this increment is enforced at the application layer (`ownerId` lookups scoped to the authenticated session). Enabling Postgres Row-Level Security policies as a second, defense-in-depth layer is flagged for Increment 7 (Hardening) per the Blueprint, not skipped — just sequenced.
- **No server actions** — this increment uses Route Handlers (`app/api/...`) instead of Next.js Server Actions, to keep the Orchestrator boundary (Section 8 of the Blueprint) as a plain, framework-agnostic function signature that will still make sense once cron/event triggers call it directly in Increment 5.
- **The Cognitive Engine decides, the LLM communicates** (Increment 4) — the Narrative Layer (`lib/narrative/`) is a strictly constrained rephrasing pass over an already-decided `MorningBriefResult`. It cannot alter a recommendation, invent evidence, or change a confidence score, and the Morning Brief works perfectly with zero LLM calls. See DECISIONS.md for the full reasoning.

## Assumptions made

- One `Business` per owner (team/multi-user access is out of scope until noted otherwise in the Blueprint's deferred list).
- Email/password auth only for v1 — no magic link or OAuth providers wired into the UI yet, though the callback route supports the confirmation-email flow.
- No `SUPABASE_SERVICE_ROLE_KEY` usage yet in application code — it's in `.env.example` in anticipation of Increment 2+ (seeded signal providers may need elevated access for background jobs), not used by anything in this increment.
- `ANTHROPIC_API_KEY` is optional. Its absence is a supported, tested path (see `tests/narrative/generate.test.ts`), not an error condition.

## Repository structure

```
app/
  (auth)/login, (auth)/signup     — authentication screens
  auth/callback                   — Supabase email confirmation handler
  onboarding/                     — 3-step wizard (profile, goals, people)
  morning-brief/                  — Experience Layer: MorningBriefCard, AllClearCard, raw signal feed
  api/onboarding/                 — Route Handlers calling into lib/brain
  api/signals/generate/           — manual Signal Provider pipeline trigger
  api/recommendations/generate/   — manual Cognitive Engine pipeline trigger
lib/
  brain/                          — Business Brain: repository + validation
  signals/                        — Signal domain model, providers, registry, pipeline
  cognition/                      — Cognitive Engine: Observe/Understand/Prioritise/Recommend, interpreters, pipeline, tiered MorningBrief persistence
  narrative/                      — Narrative Layer: NarrativeProvider seam, Claude implementation, versioned prompt contract, validation/fabrication guard
  demo/                           — Demo Mode: isDemoMode(), in-memory store, seed orchestration, auth stub (Increment 5)
  ui/                             — small presentation-only helpers (greeting, same-day check) — deliberately outside the Cognitive Engine
  supabase/                       — browser + server Supabase clients (Demo Mode-aware)
  prisma.ts                       — Prisma client singleton (guarded against construction in Demo Mode)
prisma/
  schema.prisma                   — Business Brain + Signal + tiered MorningBrief data model
tests/
  validation.test.ts              — onboarding input validation
  signals/                        — Signal Provider tests
  cognition/                      — Cognitive Engine pipeline + interpreter tests
  narrative/                      — Narrative Layer validation, fabrication guard, and graceful-degradation tests
  demo/                           — Demo Mode config, store, seed orchestration, auth stub, and repository-integration tests
  ui/                             — presentation helper tests
```

## Trying Increment 2 + 3 + 4 locally

After onboarding, the Morning Brief screen has a "Refresh signals" button that calls `POST /api/signals/generate`, persisting seeded Calendar and Email signals for your business (idempotent — re-clicking the same day won't duplicate). Once signals exist, click "Prepare my Morning Brief" to run the Cognitive Engine (`POST /api/recommendations/generate`) — it reasons over every current signal and persists one of the three Executive Honesty tiers. The page then renders that tier: a confident recommendation (with the Narrative Layer's phrasing, if `ANTHROPIC_API_KEY` is configured, otherwise the Cognitive Engine's own text), a low-confidence insight presented informationally, or a calm all-clear with today's agenda.

## Next: Increment 5

Per the Blueprint's own milestone sequence: the Executive Orchestrator — replacing the manual "Prepare my Morning Brief" trigger with a real schedule (the Good Morning Test, Asset 013A) — and/or extending the interpreter catalogue with Tasks/CRM/Finance/Proposals seeded providers now that two full increments have proven the Cognitive Engine and Narrative Layer contracts end-to-end. Sequencing decision deferred to the next planning conversation.

## What's in Increment 5

Before adding cron or more providers, a **Zero-Configuration Founder Demo** — see `DEMO.md` for the three-step version:

```
npm install
npm run dev
```

then open `http://localhost:3000`. No Supabase project, no database migration, and no Anthropic API key required.

- **`lib/demo/config.ts`** — `isDemoMode()`, the one decision point every demo adapter calls. Auto-activates when Supabase isn't configured; overridable with `NEXT_PUBLIC_DEMO_MODE=true`/`false`.
- **`lib/demo/store.ts`** — an in-memory seeded business ("Meridian Gearboxes" / "Jane Cooper," the same example already used in the interpreter tests), scoped to one process lifetime.
- **`lib/demo/seed.ts`** — runs the *real* Signal Provider and Cognitive Engine pipelines once, so the seeded Morning Brief is genuinely computed, not hand-authored.
- **`lib/demo/authStub.ts`** — a fixed demo user satisfying the same minimal `AuthClient` interface the real Supabase client does, so every existing page and API route works unchanged.
- Every repository module (`lib/brain`, `lib/signals`, `lib/cognition`) and both Supabase clients (`lib/supabase/server.ts`, `lib/supabase/client.ts`) check `isDemoMode()` and delegate to the above instead of Prisma/Supabase — the same seam pattern as `SignalProvider`/`NarrativeProvider`. No page, API route, or component needed to change.
- The Morning Brief is visibly labelled Demo Mode (a banner and a header badge) whenever it's active — see `DECISIONS.md` for the full reasoning and every file touched.


## What's in Increment 7

The Executive Orchestrator — the owner should never have to ask Business Partner to think. Implemented per the approved Product Audit and Implementation Plan; see `DECISIONS.md` for the full reasoning.

- **`lib/orchestrator/dailyCycle.ts`** — `runDailyCycleForBusiness(businessId)`, the one function every caller (onboarding, the daily schedule, tests, and any future trigger) must use to run the daily executive cycle. Wraps the existing, unmodified `generateSignalsForBusiness` and `generateMorningBrief` pipelines with an idempotency check and per-business failure isolation. Not a scheduling utility — the operational mechanism by which Business Partner arrives prepared each day.
- **`lib/cognition/repository.ts`** — `hasMorningBriefToday(businessId)`, the idempotency check: a business never receives two Morning Briefs on the same day. Implemented as a query, not a schema constraint (see `DECISIONS.md` for why, and for the noted future hardening option).
- **`lib/brain/repository.ts`** — `getAllBusinessIds()`, every business the daily cycle should run for. Deliberately unfiltered — v1 has no per-business scheduling configuration.
- **`app/api/cron/daily-cycle/route.ts`** — the scheduler-facing entry point, authenticated by `CRON_SECRET` rather than a user session (a scheduled job has no user), configured via `vercel.json` to run once daily.
- **Onboarding** (`app/api/onboarding/people/route.ts`) now calls `runDailyCycleForBusiness` synchronously at the end of the final step, so a real owner's inaugural Morning Brief exists the moment onboarding completes — no separate "first brief" code path, the same function the daily cron calls.
- The manual `/api/recommendations/generate` route is untouched — a conscious decision, not an oversight; see `DECISIONS.md`.

135 tests passing (123 existing, unchanged, plus 12 new).
