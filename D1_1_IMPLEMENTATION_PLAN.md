# Increment D1.1 — Executive Foundation & Settings Reference Implementation: Implementation Plan

Prepared by: Claude (Chief Software Engineer)
Scope basis: D1_1_AUDIT.md (Stage 1) + six Founder decisions committed 2026-07-18 (typography, Radix, icons, navigation scope, contextual panel, Danger Zone copy).
Status: Awaiting Founder approval. No code written yet.

---

## 1. Dependencies

| Package | Purpose | Scope |
|---|---|---|
| `lucide-react` | Icon system | Primary navigation only, per committed decision |
| `@radix-ui/react-dialog` | Focus-trapped, keyboard-dismissible overlay | Mobile navigation drawer only — the one genuine dialog need in D1.1 (see §3.3) |

Fraunces requires no new dependency — loaded via `next/font/google`, the same mechanism already serving Inter and IBM Plex Mono.

No other Radix primitive is added in D1.1. The Danger Zone confirmation stays as its existing inline expand/collapse (per the copy-preservation decision), not a modal — so it doesn't need Radix Dialog. I want to flag this honestly rather than force a second Radix usage just to justify the dependency: the mobile nav drawer is the only place in this increment's real scope that needs it.

---

## 2. Design Tokens (`tailwind.config.ts`)

```
fontFamily: {
  body: [...existing...],
  editorial: ['var(--font-editorial)', 'serif'],
  mono: [...existing...],
},
colors: {
  ...existing ink / surface / brass / signal...,
  danger: {
    DEFAULT: '<TBD — derived from existing signal.attention family, not a new arbitrary hue>',
    surface: '<a quiet tinted surface, not a saturated red>',
  },
},
```

Exact hex values will be derived from the existing `signal.attention` (`#B5651D`) family rather than introduced as an unrelated red, so the Danger Zone still reads as "part of Business Partner's palette" rather than a generic bootstrap-danger red — consistent with Asset 021 §6 ("palette should remain warm, restrained and grounded").

---

## 3. Font Loading (`app/layout.tsx`)

Add Fraunces alongside the existing Inter/IBM Plex Mono loads:

```
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],   // two static instances only — not the full variable range
  variable: '--font-editorial',
});
```

Two weights only (medium for supporting editorial statements, semibold for headlines/titles) — proportionate to how rarely Asset 021 says this typeface should appear.

`app/globals.css` changes:
- The blanket `h1, h2, h3 { @apply font-body }` rule is removed. Heading *tags* no longer imply a typography role — Asset 021 assigns roles by function (page title vs. section label vs. settings row), not by HTML element. Two new utility classes replace it: `.text-editorial-title` (Fraunces, for `PageIntro`) and `.text-editorial-headline` (Fraunces, larger, for Morning Brief headlines only — not touched in D1.1, but the class is established now so Morning Brief inherits it later without reinvention).
- Section labels (`Personal`, `Connections`, `Your Business Data`) move from `font-mono text-xs uppercase tracking-wide` to a plain Inter label style — resolving Audit I2.
- Design-system doc comment at the top of the file is extended to document the dual-type rationale, mirroring its existing style.

---

## 4. New Executive Foundation Components (`components/foundation/`)

**`AppShell.tsx`** — server component. Renders the persistent nav (desktop) and mobile nav trigger, a primary content slot (`children`), and an optional contextual panel slot. Applied to `/morning-brief` and `/settings` only — not to `/login`, `/signup`, `/onboarding`, which stay outside the authenticated shell for now.

**`Nav.tsx`** — the two real destinations only: Morning Brief, Settings. Active state via `usePathname()`, communicated through more than colour alone (per Asset 021 §13.2) — weight change plus the brass accent, not colour alone. Lucide icons, subordinate to labels, per the committed icon decision.

**`MobileNav.tsx`** — Radix `Dialog` as the drawer mechanism: correct focus trap while open, `Escape` to dismiss, focus restored to the trigger on close. Reuses `Nav` inside it rather than duplicating the destination list.

**`AccountBlock.tsx`** — avatar, preferred name, business name, and the existing `SignOutButton` (reused, not rebuilt). No dropdown menu: there are no additional account actions to house in one yet, and adding a dropdown affordance for actions that don't exist would repeat the exact truthfulness issue the navigation-scope decision just resolved.

**`PageIntro.tsx`** — the "judgement before mechanics" component (Audit I1, Asset 021 §3.2/§4): an editorial title (`.text-editorial-title`) plus one supporting sentence in Business Partner's voice. Used at the top of Settings in D1.1; available for any future page.

**`ContextualPanel.tsx`** — the secondary-voice component from the committed decision. Content contract, deliberately narrow:
```
{
  orientation: string;   // one short paragraph — why this page matters, one sentence to two
  children?: ReactNode;  // optional, restrained supplementary content — used sparingly
}
```
No `title` prop that invites a repeated heading, no open-ended slot system — the narrowness of the contract is intentional, to resist the drift toward "populating it because space is available" that the Founder decision explicitly warned against.

---

## 5. Settings-Specific Semantic Components

**`ConnectionCard.tsx`** (Audit P3) — extracts the shared Calendar/Gmail pattern (status copy, error state, connect/disconnect action) into one component instead of two near-identical blocks in `page.tsx`.

**`DangerPanel.tsx`** — wraps the *existing, unmodified* `DeleteBusinessSection` in the new `danger` visual treatment and separates it from Export in its own section, per the copy-preservation decision. `DeleteBusinessSection.tsx` itself is not touched — its copy, confirmation flow, and feedback field are exactly as they are today.

A generic `SettingSection.tsx` (heading + content, replacing the repeated `rounded-lg border bg-surface-card p-6` wrapper) gives Personal, Connections, and Your Business Data distinguishable structure rather than three identical cards (Audit C3) — Connections and the Danger Zone get heavier visual treatment than Personal, since they carry more consequence.

---

## 6. Scope Boundary I'm Assuming — Flagging Rather Than Silently Deciding

The mockup's Settings screen is actually a *different information architecture* than what exists today: a list of rows linking out to sub-pages (Notifications, Security & Access, Workspace), most of which don't exist. Building that would repeat the exact truthfulness problem the navigation decision just resolved. I'm keeping the current flat, single-page structure (Personal / Connections / Your Business Data) and restyling it with the new semantic components, not restructuring Settings into a directory of mostly-nonexistent sub-pages. Flagging this rather than treating it as settled, since it wasn't asked directly — but it follows directly from the same principle you already decided for navigation.

One necessary consequence of the navigation decision: **Morning Brief also needs `AppShell`**, not just Settings — otherwise clicking "Morning Brief" from Settings' nav would drop the owner into a page with no shell at all, which breaks the "stable across authenticated surfaces" requirement (Asset 021 §13.1) the nav exists to satisfy. I'm treating this as a logical necessity rather than a new open question, but Morning Brief only adopts `AppShell` itself in D1.1 — not `PageIntro` or `ContextualPanel`, which stay scoped to Settings as the increment's name specifies. Say so if you'd rather Morning Brief stay untouched entirely and have Settings live without shared nav for now.

---

## 7. Non-Goals for D1.1

- Insights, Customers, Projects, Tasks, Conversations, Documents — not built, not in navigation
- Settings sub-pages (Notifications, Security & Access, Workspace) — not built
- Account dropdown menu — no actions exist to populate one yet
- Onboarding/auth screens — not touched (may inherit typography tokens in a later increment)
- Any change to `DeleteBusinessSection`'s copy or confirmation logic

---

## 8. Test Plan

New component tests: `Nav` (renders only the two real destinations, correct active state), `MobileNav` (Radix dialog opens/closes, focus trapped while open, focus restored to trigger on close, dismissible via `Escape`), `ContextualPanel` (renders orientation text, omits empty optional content gracefully), `ConnectionCard` (parameterized so existing Calendar/Gmail behaviour is provable unchanged), `SettingSection`/`DangerPanel` (presentational, consistent with this project's existing pattern of not writing render tests for pure layout).

Existing tests: no logic changes to `DeleteBusinessSection`, `DisconnectButton`, `ExportDataLink`, `PreferredNameSection`, or any API route — I expect the current suite to pass unchanged, plus the new component tests above. `npx tsc --noEmit` checked for new errors introduced, distinguished from the pre-existing sandbox-only category already documented in DECISIONS.md.

Manual verification before presenting as ready: keyboard-only pass through both pages (tab order, visible focus, `Escape` on mobile drawer), zoom-to-200% reflow check, and the 8-point Pre-Ship Walkthrough Checklist — including walking the real signup → onboarding → Morning Brief → Settings path, not just loading `/settings` directly.

---

Awaiting your approval before implementation begins. Section 6 is the one place I'd like explicit confirmation rather than silent agreement, since it's a scope call, not just an engineering detail.
