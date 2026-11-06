# Validate: Mobile-Responsive UI Pass

## Checklist by surface

### Shared header (`AppHeader`)
- [x] Implemented (`components/AppHeader.tsx`) — drawer under `md`, desktop inline
- [ ] At 375px: logo, search, and menu button visible; no horizontal scroll
- [ ] Drawer opens/closes; links navigate; Sync / logout work when shown
- [ ] Desktop (≥1024): Browse / Listen Later / Sync / user still inline as before

### Player (`GlobalAudioPlayer`)
- [x] Mobile stacked dock + safe-area padding
- [ ] Mobile dock shows title (truncated), play, skip, scrubber without overflow
- [ ] Content above is not permanently covered (bottom padding)
- [ ] Desktop three-column layout still readable

### Home
- [x] `AppHeader` wired; spotlight / shelf / genre chips mobile pass
- [ ] Spotlight CTAs wrap; no clipped text
- [ ] Shelves are 2-col on phone; section titles readable
- [ ] Categories appear below shelves on phone, side column on `lg+`

### Auth
- [x] Tighter mobile padding
- [ ] Sign-in form usable on 375px; primary button fully visible
- [ ] Mode switches (sign up / forgot) still work

### Books / Detail / Listen Later
- [x] Shared `AppHeader variant="back"` on all three
- [ ] Back + search usable on phone
- [ ] Filters/sort don’t force horizontal page scroll
- [ ] Detail play actions reachable with player open

## Regression
- [ ] Desktop homepage still matches prior composition
- [ ] Persistent player continues across route changes
- [ ] Auth overlay still gates unauthenticated home
