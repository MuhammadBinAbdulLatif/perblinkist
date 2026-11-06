# Requirements: Mobile-Responsive UI Pass

## 1. Problem Statement
PerBlinkist’s desktop UI (zinc/shadcn library aesthetic) works well on wide screens but breaks down on phones: the sticky header overflows, search and Sync compete for space, horizontal shelves / multi-column headers wrap awkwardly, the persistent player is a single desktop row, and secondary pages reuse non-adaptive chrome. Mobile must feel intentional — same visual language, reflowed for thumb reach — not a squashed desktop layout.

## 2. Goals
- Usable single-column layouts from **320px** upward; desktop (≥1024px) unchanged in spirit.
- Shared mobile chrome (header + player) so every route behaves consistently.
- Preserve `specs/styles.md` zinc / shadcn aesthetic — no new color system, no “AI purple”, no card clutter.
- Touch targets ≥ **44px** for primary controls; no horizontal page scroll.
- Bottom player must not obscure primary CTAs (`pb` / safe-area aware).

## 3. Out of Scope
- Native apps / Capacitor / React Native.
- Full PWA install flow (may be noted as follow-up).
- Redesigning desktop visual identity.
- Auth cookie / ingestion bugs (tracked separately).

## 4. Surfaces (work order)

| # | Surface | Files |
|---|---------|--------|
| 0 | Spec | `specs/mobile-responsive-ui/*` |
| 1 | Shared header / nav | `components/AppHeader.tsx` (new), wired into pages |
| 2 | Persistent player | `components/GlobalAudioPlayer.tsx` |
| 3 | Home dashboard | `app/page.tsx` |
| 4 | Auth overlay | `components/AuthScreen.tsx` |
| 5 | All Books catalog | `app/books/page.tsx` |
| 6 | Book detail | `app/book/[id]/page.tsx` |
| 7 | Listen Later | `app/listen-later/page.tsx` |
| 8 | Global search | `components/GlobalSearchBar.tsx` |

## 5. User Stories & Acceptance Criteria

### US-1 — Shared mobile header
- Below `md`: logo + compact search + hamburger (or menu) that opens a full-height drawer with Browse, Listen Later, Sync / scan status, user + sign out.
- From `md` up: existing desktop header pattern (links + search + actions inline).
- No overlapping / clipped controls at 375×812.

### US-2 — Mobile player dock
- When a book is playing, dock stacks: progress full-bleed, cover + title truncated, large play/pause, skip, rate.
- Optional “Details” becomes icon or text that fits without overflow.
- Respects `env(safe-area-inset-bottom)`.

### US-3 — Home dashboard
- Spotlight: single column, readable type scale, CTAs wrap cleanly.
- Shelves: 2-column grids on phones (already partial); section titles don’t collide with “View all”.
- Genre sidebar: stacks **below** shelves on mobile (not a squeezed third column); optional horizontal genre chips as progressive enhancement.
- Header actions (Sync labels, cooldown badge) live in the mobile drawer, not a crowded top row.

### US-4 — Auth
- Form-first full screen on small viewports (already mostly true); comfortable padding, no cut-off buttons above the keyboard / player.

### US-5 — Books / Listen Later / Detail
- Headers use shared chrome with back affordance.
- Filters / sort stack vertically on small screens.
- Book detail: cover + play block stacked; secondary actions wrap; recommendations remain 2-col on phones.

## 6. Non-Functional
- No layout shift that hides the player under content.
- Prefer Tailwind responsive utilities; extract shared chrome once rather than copy-paste per page.
- **No Git commits** unless explicitly requested.
