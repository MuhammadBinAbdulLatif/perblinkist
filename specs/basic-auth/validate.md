# Validation Checklist: Basic Authentication

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **User Schema Migration** | `User` table exists in SQLite with unique username and hashed password. | [ ] |
| **Password Hashing** | Raw passwords are never stored in plain text; bcrypt hashes are used. | [ ] |
| **Initial Setup Flow** | Detects when 0 users exist and allows initial Admin creation. | [ ] |
| **Second Setup Prevented** | Subsequent attempts to call `setupInitialAdmin` are rejected with `403/CONFLICT`. | [ ] |
| **Wrong Password Rejection** | Invalid credentials return `UNAUTHORIZED` without leaking user existence. | [ ] |
| **JWT Session Generation** | Valid login generates signed JWT and sets HTTP-only cookie. | [ ] |
| **Protected Procedure Guard** | Calling protected procedures without valid session fails with `UNAUTHORIZED`. | [ ] |
| **Visual Styling Compliance** | Auth screen adheres to `specs/styles.md` (flashy emerald glows, shadcn clean lines). | [ ] |

---

## Test Execution Command
```powershell
pnpm exec tsx scripts/test-auth.ts
```
