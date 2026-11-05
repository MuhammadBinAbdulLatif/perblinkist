# User Preferences & Standards

This document preserves the user's architectural and workflow preferences for **PerBlinkist**. The agent must respect these guidelines at all times.

---

## 1. Framework & Architecture
- **Framework Choice**: **Next.js** (App Router, TypeScript, React 19 / Modern React) or **TanStack Start**.
  - Modern, full-stack, cohesive, enterprise-grade ecosystem.
  - Server components, Server Actions / Route Handlers for file scanning & streaming, eliminating split multi-server bloat.
  - No 1980s-feeling legacy setups; sleek, modern DX with high ecosystem support.
- **ORM / Database**: **Prisma** with SQLite.
  - Type-safe models, clean schema migrations, and high developer ergonomics.

## 2. Package Manager
- **Always use `pnpm`** instead of `npm` or `yarn`.
  - Faster installs, disk-efficient content-addressable storage, strict dependency resolution.

## 3. Styling & UI
- **Tailwind CSS** (v4 or latest) with modern typography and animations.
- Icons: **Lucide React**.
- Aesthetic: Modern, minimalist Blinkist/Audible dark & light mode styling.

## 4. Git & Workflow
- User retains review control: the user will create and inspect commits when milestones are reached.
- Changes are pushed cleanly to GitHub with meaningful history.
