# Validation Checklist: Basic Authentication

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **User Schema Migration** | `User` table exists in SQLite with unique username and hashed password. | [x] Passed (Prisma model deployed) |
| **Password Hashing** | Raw passwords are never stored in plain text; bcrypt hashes are used. | [x] Passed (Bcrypt salt rounds: 10) |
| **Initial Setup Flow** | Detects when 0 users exist and allows initial Admin creation. | [x] Passed (First-run modal & procedure) |
| **Second Setup Prevented** | Subsequent attempts to call `setupInitialAdmin` are rejected with `403/CONFLICT`. | [x] Passed (Rejected duplicate admin) |
| **Wrong Password Rejection** | Invalid credentials return `UNAUTHORIZED` without leaking user existence. | [x] Passed (Invalid password rejected) |
| **JWT Session Generation** | Valid login generates signed JWT and sets HTTP-only cookie. | [x] Passed (perblinkist_token issued) |
| **Protected Procedure Guard** | Calling protected procedures without valid session fails with `UNAUTHORIZED`. | [x] Passed (Blocked unauthenticated caller) |
| **Visual Styling Compliance** | Auth screen adheres to `specs/styles.md` (flashy emerald glows, shadcn clean lines). | [x] Passed (Electric emerald card modal) |

---

## Test Execution Command
```powershell
pnpm exec tsx scripts/test-auth.ts
```
