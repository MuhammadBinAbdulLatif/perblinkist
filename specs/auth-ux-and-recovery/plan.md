# Implementation Plan: Authentication UX & Password Recovery

## 1. Schema Additions (`prisma/schema.prisma`)
Add security question fields to `User`:
```prisma
model User {
  id                   String   @id @default(cuid())
  username             String   @unique
  email                String?  @unique
  passwordHash         String
  isAdmin              Boolean  @default(false)
  securityQuestion     String?  // e.g. "What was the name of your first pet?"
  securityAnswerHash   String?  // Salted bcrypt hash of trimmed, lowercased answer

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

---

## 2. Standard Security Questions
Curate simple, intuitive options:
- "What was the name of your first pet?"
- "In which city or town were you born?"
- "What was the make and model of your first car?"
- "What was your childhood nickname?"
- "What was the name of your elementary school?"
- "What is your favorite book of all time?"

---

## 3. Answer Normalization & Hashing Helper (`lib/auth.ts`)
- Normalize answer: `rawAnswer.trim().toLowerCase()`.
- Hash and verify with `bcryptjs`.

---

## 4. tRPC Procedure Extensions (`server/routers/auth.ts`)
- Extend `setupAdmin` to accept `securityQuestion` and `securityAnswer`.
- Add `register`: creates standard non-admin user with security question.
- Add `getSecurityQuestion`: takes `username` -> returns public question string.
- Add `resetPasswordWithSecurityAnswer`:
  - Validates `verifyPassword(normalizedAnswer, user.securityAnswerHash)`.
  - Hashes new password and updates `passwordHash`.
  - Issues new session cookie and returns success.

---

## 5. UI Implementation (`components/AuthScreen.tsx`)
- Tabbed/state-driven view inside the right half of the split-screen:
  - `mode === 'signin'`: Clean inputs for username & password, plus footer navigation links.
  - `mode === 'signup'`: Inputs for username, password, security question selector (`<select>`), and answer input.
  - `mode === 'forgot'`: Two-step wizard:
    1. Enter username -> fetches question.
    2. Displays security question as prompt -> user enters answer & new password -> submits.
- Smooth transitions and clean shadcn styling with clear error alerts.
