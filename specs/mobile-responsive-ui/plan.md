# Plan: Mobile-Responsive UI Pass

## Approach
Keep the existing zinc/dark editorial look. Fix **structure** (breakpoints, shared chrome, stacking) rather than inventing a second design system. Work **surface-by-surface** in the order below; each step should leave desktop looking as good as today.

## Breakpoints (Tailwind defaults)
- `< md` (≤767px): phone — drawer nav, stacked player, single/2-col content
- `md`–`lg`: tablet — more inline chrome, still careful wrapping
- `≥ lg`: current desktop compositions

## Step 1 — Shared `AppHeader`
**New:** `components/AppHeader.tsx`

Props (minimal):
- `variant`: `'home' | 'back'`
- `backHref` / `backLabel` for subpages
- `username?`, `onLogout?`
- Optional home-only slot: scan status + Sync / Reset Cooldown actions
- Always includes `GlobalSearchBar` (compact on mobile)

Mobile pattern:
```
[Logo]  [Search……………]  [☰]
         ↓ drawer
   Browse All · Listen Later · Sync · User · Sign out
```

Desktop: current home header layout reconstituted via the same component.

Wire into: `app/page.tsx`, then later `/books`, `/listen-later`, `/book/[id]`.

## Step 2 — `GlobalAudioPlayer`
Restructure DOM into responsive flex:
- Mobile: column — scrubber on top (full width), then row of cover/title | controls | rate
- Desktop: keep three-column row
- Add `pb-safe` / `padding-bottom: env(safe-area-inset-bottom)`
- Ensure pages keep `pb-24`+ so content clears the taller mobile dock

## Step 3 — Home (`app/page.tsx`)
- Replace inline header with `AppHeader`
- Spotlight padding `p-5 sm:p-8`; title `text-2xl sm:text-3xl md:text-4xl`
- Shelf headers: allow wrap; hide long subtitles under `sm`
- Categories aside: already `lg:col-span-3`; on mobile add horizontal scroll chips **or** keep vertical list under shelves (prefer vertical list first for simplicity)
- Remove duplicate nav strings now owned by AppHeader

## Step 4 — Auth (`AuthScreen.tsx`)
- Tighten mobile padding (`p-6`), ensure form max width and scroll
- Keep `lg:hidden` brand; no left editorial panel on phones (already)

## Step 5 — Books catalog
- Use `AppHeader variant="back"`
- Category pills: horizontal scroll (`overflow-x-auto`) instead of wrap chaos
- Sort + title stack on small screens (partially done)

## Step 6 — Book detail
- Cover / meta stack; action row wraps with gap
- Inline player controls sized for thumb
- Recommendations grid `grid-cols-2`

## Step 7 — Listen Later
- Shared header; list rows full-width with truncated titles; action icons stay tappable

## Step 8 — GlobalSearchBar
- Shorter mobile placeholder (“Search library…”)
- Dropdown uses `fixed` or full-bleed under header on very small widths if clipped

## Verification
See `validate.md`. Manual check at 375, 390, 768, 1280 widths (browser device mode).
