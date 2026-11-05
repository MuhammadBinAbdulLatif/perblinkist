# Design System & Visual Style Guide: PerBlinkist

## 1. Visual Philosophy & Core Aesthetic
PerBlinkist embodies a **modern, flashy, inviting, and vibrant greenish aesthetic**.
It combines the clean precision and typographic sophistication of **shadcn/ui** with an energetic, lush, neon-emerald color palette that feels friendly, premium, and captivating rather than sterile or boring.

### Core Vibes:
- **Lush & Electric Emeralds**: Deep forest slates contrasted with energetic mint, lime, and glowing emerald accents (`#10b981`, `#059669`, `#34d399`, `#6ee7b7`, `#a7f3d0`).
- **Glassmorphism & Depth**: Translucent surfaces (`bg-slate-900/80 backdrop-blur-md`), subtle green border glows (`border-emerald-500/20 shadow-emerald-950/30`), and soft radial atmospheric gradients.
- **Micro-Interactions & Tactility**: Snappy scale transforms on click (`active:scale-95`), smooth hover transitions (`transition-all duration-200 ease-out`), and vibrant glowing focus rings (`focus:ring-2 focus:ring-emerald-400/50`).
- **Typographic Precision**: High-contrast, clean sans-serif typography with generous line-heights, crisp letter-spacing for badges and metadata (`uppercase tracking-wider text-[11px] font-semibold`), and expressive headlines.

---

## 2. Color Palette & Semantic Tokens

```
Backgrounds:
- Body / Root:       slate-950 (#020617) with subtle radial emerald ambient glows
- Elevated Cards:    slate-900/90 (#0f172a) with border border-slate-800/80
- Card Hover:        slate-850 (#151f33) with border-emerald-500/40 glow
- Glass Panels:      slate-900/85 backdrop-blur-xl border border-slate-800/90

Vibrant Accents (The "PerBlinkist Green" Gradient):
- Primary Accent:    emerald-500 (#10b981) -> teal-400 (#2dd4bf)
- Spotlight Glow:    emerald-400 (#34d399) / emerald-300 (#6ee7b7)
- Subtle Pill Fill:  emerald-500/10 with border-emerald-500/25 & text-emerald-400
- Play Buttons:      bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-lg shadow-emerald-500/25

Text Hierarchy:
- Headings:          text-white (font-extrabold / font-bold tracking-tight)
- Accent Text:       text-emerald-400 / text-teal-300
- Body:              text-slate-200 / text-slate-300
- Muted / Secondary: text-slate-400 / text-slate-500
```

---

## 3. UI Component Patterns (shadcn-inspired with Color)

### 3.1 Buttons & Action Controls
- **Primary Glow Button**:
  `bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all`
- **Secondary Ghost / Outline**:
  `bg-slate-900/60 hover:bg-slate-800 border border-slate-750 hover:border-emerald-500/40 text-slate-200 rounded-full px-4 py-2 transition-all`
- **Icon Buttons**:
  `w-10 h-10 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 transition-colors`

### 3.2 Form Inputs & Text Fields
- **Search & Authentication Fields**:
  `bg-slate-900/90 border border-slate-750 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 transition-all outline-none`

### 3.3 Cards & Shelves
- **Book Summary Card**:
  - Aspect ratio: `3/4` cover poster with rounded corners (`rounded-2xl`).
  - Dark slate container with soft border: `border border-slate-800/80 hover:border-emerald-500/40`.
  - Subtle hover lift and gradient sheen.
  - Floating circular play button on card hover.

### 3.4 Persistent Bottom Player Bar
- Glassmorphic dock fixed to viewport bottom (`bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90`).
- Progress track: `bg-slate-800` trough with `bg-gradient-to-r from-emerald-500 to-teal-400` fill and glowing thumb knob.
- Scrubbable, responsive, distraction-free.

---

## 4. Authentication Experience Spec
- **Card-centric Modal or Standalone View**:
  - Centered glowing card with subtle radial gradient behind it: `radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)`.
  - Logo with electric emerald sparkle icon.
  - Classic login (Username/Email + Password) with session cookie token.
  - Modern validation states: clean inline error alerts with emerald accents or crisp rose warning badges.
