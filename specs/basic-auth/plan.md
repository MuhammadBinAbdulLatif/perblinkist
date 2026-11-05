# Implementation Plan: Basic Authentication & User Sessions

## 1. Schema Additions (`prisma/schema.prisma`)
Add `User` model:
```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  email        String?  @unique
  passwordHash String
  isAdmin      Boolean  @default(false)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 2. Authentication Utilities (`lib/auth.ts`)
- Password hashing using `bcryptjs` (salt rounds: 10).
- JWT signing & verification using `jsonwebtoken` (secret configured via `JWT_SECRET` env var with secure fallback).
- Cookie helper functions (`serializeAuthCookie`, `clearAuthCookie`, `getAuthTokenFromCookies`).

---

## 3. tRPC Context & Auth Router
1. **Context Creation (`server/context.ts`)**:
   - Extract cookies from incoming request.
   - Verify JWT and attach `user: { id, username, isAdmin } | null` to the tRPC context.
2. **Procedures**:
   - `publicProcedure`: Unprotected calls (e.g. `login`, `registerInitialAdmin`, `getSystemStatus`).
   - `protectedProcedure`: Rejects with `TRPCError({ code: 'UNAUTHORIZED' })` if `ctx.user` is null.
3. **Auth Router (`server/routers/auth.ts`)**:
   - `getSetupStatus`: returns `{ hasUsers: boolean, user: ctx.user }`.
   - `setupInitialAdmin`: registers first user with `isAdmin: true`.
   - `login`: checks password, returns JWT and sets cookie via response headers.
   - `logout`: clears cookie.

---

## 4. UI Components (`components/AuthModal.tsx` / `app/page.tsx`)
- Render flashy, modern green Auth Dialog when user is not logged in or during initial setup.
- Glassmorphic card with `shadow-emerald-950/40`, emerald-teal button gradients, and micro-animations.

---

## 5. Verification Test Suite (`scripts/test-auth.ts`)
Automated test script executing registration, bad login check, valid login check, and token verification.
