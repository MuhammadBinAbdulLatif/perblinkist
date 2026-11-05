# Design System & Visual Style Guide: PerBlinkist (Formal Shadcn Theme)

## 1. Visual Philosophy & Core Aesthetic
PerBlinkist adopts a **minimalist, formal, premium, monochromatic aesthetic** directly aligned with the official **shadcn/ui** design system (Zinc/Neutral Dark palette).

### Core Principles:
- **No Gimmicky AI Vibes**: Zero fluorescent green gradients, zero glowing neon auras, zero decorative sparkle emojis. The design reflects an editorial, academic, and literary library.
- **Deep Monochromatic Contrast**: Pure blacks (`#000000`, `zinc-950`), muted slate borders (`zinc-800`), crisp white typography (`#ffffff`), and subtle secondary grays (`zinc-400`).
- **Precision Typography**: Clean geometric sans typography with strict hierarchical sizing, muted subtitles, and restrained padding.
- **Understated Elegance**: Sophisticated, professional, and literary.

---

## 2. Color Palette & Semantic Tokens (Official Shadcn Zinc Palette)

```
Backgrounds:
- Body / Root:       #09090b (zinc-950)
- Surface / Cards:   #09090b or #18181b (zinc-900) with border border-zinc-800
- Secondary Panel:   #09090b border-r border-zinc-800
- Form Inputs:       bg-zinc-900/60 border border-zinc-800 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400

Accents & Controls:
- Primary Button:    bg-white text-zinc-950 hover:bg-zinc-200 font-medium rounded-md
- Secondary Button:  bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-800 rounded-md
- Play Buttons:      bg-white text-zinc-950 hover:bg-zinc-200 shadow-sm
- Badges / Pills:    bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 rounded-md px-2.5 py-0.5 text-xs

Text Hierarchy:
- Headlines:         text-zinc-50 font-semibold tracking-tight
- Body Text:         text-zinc-200
- Muted / Captions:  text-zinc-400 / text-zinc-500
```

---

## 3. Brand Identity & Logo
- **Logo Concept**: Minimalist, architectural geometric monogram combining an open book curve with soundwave arcs.
- Clean vector SVG with precision lines, rendered in crisp monochrome (`white`/`zinc-100`).
- Wordmark: **PerBlinkist** in clean semibold type with an understated subtitle ("Personal Audiobook Summaries • Self-Hosted").

---

## 4. Split-Screen Authentication Layout (Shadcn Auth Archetype)
The authentication page (`/login` or initial auth view) is divided into **two horizontal halves (50/50 split on desktop)**:

### Left Half (The Literary Side)
- Deep `zinc-900` / `zinc-950` dark background with subtle texture or high-contrast editorial photography of books/libraries.
- Top: PerBlinkist logo and wordmark.
- Bottom: Prominent, timeless literary quotation about reading and knowledge:
  > *"A reader lives a thousand lives before he dies. The man who never reads lives only one."*  
  > — George R.R. Martin
- Muted author attribution and understated instance footer.

### Right Half (The Clean Form Side)
- Pure, focused sign-in card centered on the screen.
- Supports smooth, tabless state transitions between three modes:
  1. **Sign In**: Username/password credentials with *"Forgot password?"* link and *"Don't have an account? Sign up"* transition.
  2. **Sign Up**: Create account with security question dropdown and answer input for password recovery.
  3. **Account Recovery (Forgot Password)**: 2-step lookup: enter username $\to$ answer security question $\to$ set new password.
- Inputs: Single-line bordered inputs styled via official shadcn `Input`.
- Primary button: Solid high-contrast white button with crisp black text (`Button` from shadcn).
- Clean inline error states in formal muted red.
