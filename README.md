# Business Partner

The AI Chief Operating Officer for SMEs. This repo implements, in order:

- **Increment 1 — Business Brain Foundation**
- **Increment 2 — Signal Provider Abstraction**
- **Increment 3 — Cognitive Engine v1**

per `Business_Partner_MVP_Blueprint_v1.0.md`. See `DECISIONS.md` for the traceable log of why things are built the way they are — including the Increment 3 sequencing change (Cognitive Engine before completing all Signal Provider domains).

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

## What's deliberately not in this increment

No Executive Orchestrator or scheduling (Increment 5) — the pipeline runs on a manual trigger. No Tasks/CRM/Finance/Proposals signal types or interpreters yet — the interpreter registry is built to accept them without any change to the pipeline itself. No LLM call in the reasoning path yet — v1 is deliberately deterministic and rule-based so the pipeline's shape can be trusted and audited before a non-deterministic reasoner enters it (see DECISIONS.md).

## Getting started

### 1. Create a Supabase project
Create a project at supabase.com. From **Settings → API**, copy the URL and anon key. From **Settings → Database**, copy the pooled connection string (`DATABASE_URL`) and the direct connection string (`DIRECT_URL`, used for migrations).

### 2. Configure environment
```bash
cp .env.example .env
# fill in the four values
```

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

This project was scaffolded and type-checked in a network-restricted sandbox that cannot reach `binaries.prisma.sh` (Prisma's engine CDN), so `prisma generate` couldn't be run here — the only type errors present are the resulting missing `@prisma/client` exports. Everything else type-checks cleanly and the Vitest suite passes. In a normal dev machine, CI runner, or Vercel build (all of which have unrestricted internet access), `npm install` → `npm run db:migrate` resolves this immediately as part of the standard Prisma workflow.

## Architectural decisions worth flagging

- **`lib/brain/repository.ts` is the only module that touches Business/Goal/Person persistence.** API routes never call Prisma directly — this is the enforcement point for "the Brain is the single source of truth" (Blueprint §3, §4).
- **Onboarding goals use replace-not-patch semantics** (`replaceGoals` deletes and recreates the full list). This is the simplest correct behaviour for a short, infrequently-edited list; revisit only if granular goal editing becomes a frequent action post-MVP.
- **The People step is skippable.** Per the Product Principles ("no twenty-field questionnaires," "no unnecessary friction"), nothing in onboarding is mandatory beyond business name and industry.
- **RLS is not yet configured in Supabase directly** — tenant isolation in this increment is enforced at the application layer (`ownerId` lookups scoped to the authenticated session). Enabling Postgres Row-Level Security policies as a second, defense-in-depth layer is flagged for Increment 7 (Hardening) per the Blueprint, not skipped — just sequenced.
- **No server actions** — this increment uses Route Handlers (`app/api/...`) instead of Next.js Server Actions, to keep the Orchestrator boundary (Section 8 of the Blueprint) as a plain, framework-agnostic function signature that will still make sense once cron/event triggers call it directly in Increment 5.

## Assumptions made

- One `Business` per owner (team/multi-user access is out of scope until noted otherwise in the Blueprint's deferred list).
- Email/password auth only for v1 — no magic link or OAuth providers wired into the UI yet, though the callback route supports the confirmation-email flow.
- No `SUPABASE_SERVICE_ROLE_KEY` usage yet in application code — it's in `.env.example` in anticipation of Increment 2+ (seeded signal providers may need elevated access for background jobs), not used by anything in this increment.

## Repository structure

```
app/
  (auth)/login, (auth)/signup     — authentication screens
  auth/callback                   — Supabase email confirmation handler
  onboarding/                     — 3-step wizard (profile, goals, people)
  morning-brief/                  — Experience Layer: recommendation card + raw signal feed
  api/onboarding/                 — Route Handlers calling into lib/brain
  api/signals/generate/           — manual Signal Provider pipeline trigger
  api/recommendations/generate/   — manual Cognitive Engine pipeline trigger
lib/
  brain/                          — Business Brain: repository + validation
  signals/                        — Signal domain model, providers, registry, pipeline
  cognition/                      — Cognitive Engine: Observe/Understand/Prioritise/Recommend, interpreters, pipeline, MorningBrief persistence
  supabase/                       — browser + server Supabase clients
  prisma.ts                       — Prisma client singleton
prisma/
  schema.prisma                   — Business Brain + Signal + MorningBrief data model
tests/
  validation.test.ts              — onboarding input validation
  signals/                        — Signal Provider tests
  cognition/                      — Cognitive Engine pipeline + interpreter tests
```

## Trying Increment 2 + 3 locally

After onboarding, the Morning Brief screen has a "Refresh signals" button that calls `POST /api/signals/generate`, persisting seeded Calendar and Email signals for your business (idempotent — re-clicking the same day won't duplicate). Once signals exist, click "Prepare my Morning Brief" to run the Cognitive Engine (`POST /api/recommendations/generate`) — it reasons over every current signal and shows the single highest-priority recommendation, with its reasoning, confidence, and the supporting signals it was traced back to.

## Next: Increment 4

Options on the table, per the Blueprint's own milestone sequence: extend the interpreter catalogue with Tasks/CRM/Finance/Proposals seeded providers now that the Cognitive Engine can prove out new signal types as they're added, or move to the real Morning Brief experience (scheduling, richer UI) around the one recommendation type that already works end-to-end. Sequencing decision deferred to the next planning conversation.
