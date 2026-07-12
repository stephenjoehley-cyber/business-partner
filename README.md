# Business Partner

The AI Chief Operating Officer for SMEs. This repo implements, in order:

- **Increment 1 — Business Brain Foundation**
- **Increment 2 — Signal Provider Abstraction**

per `Business_Partner_MVP_Blueprint_v1.0.md`. See `DECISIONS.md` for the traceable log of why things are built the way they are.

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

No Cognitive Engine, no Executive Orchestrator, no scheduling, no live integrations, no Tasks/CRM/Finance/Proposals providers yet (Increment 3). The Morning Brief screen still shows raw signals rather than a reasoned recommendation — that reasoning is Increment 4's job, not Increment 2's.

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
  morning-brief/                  — placeholder Experience Layer screen
  api/onboarding/                 — Route Handlers calling into lib/brain
lib/
  brain/                          — Business Brain: repository + validation
  supabase/                       — browser + server Supabase clients
  prisma.ts                       — Prisma client singleton
prisma/
  schema.prisma                   — Business Brain data model
tests/
  validation.test.ts              — onboarding input validation
```

## Trying Increment 2 locally

After onboarding, the Morning Brief screen has a "Refresh signals" button under a **Signals (preview)** section. Clicking it calls `POST /api/signals/generate`, which runs the pipeline and persists seeded Calendar and Email signals for your business — re-clicking it the same day won't create duplicates (idempotent upsert on `externalRef`).

## Next: Increment 3

Seeded Tasks, CRM, and Finance/Proposals providers — completing all six domains before the Cognitive Engine (Increment 4) has enough signal variety to reason over meaningfully.
