# Validation Checklist: Authentication UX & Password Recovery

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Security Question Schema** | `securityQuestion` and `securityAnswerHash` added to `User` model. | [x] PASS |
| **Answer Privacy** | Answers are trimmed, lowercased, and salted with bcrypt. | [x] PASS |
| **New User Registration** | Standard users can sign up with username, password, and security Q&A. | [x] PASS |
| **Forgot Password Prompt Lookup** | System returns the user's security question without exposing the answer. | [x] PASS |
| **Wrong Answer Blocked** | Submitting an incorrect answer rejects the password reset with `UNAUTHORIZED`. | [x] PASS |
| **Successful Password Reset** | Submitting the correct answer updates the password and signs the user in. | [x] PASS |
| **Login with New Password** | User can sign out and log back in using the newly updated password. | [x] PASS |
| **UI Mode Switching** | Seamless navigation between Sign In, Sign Up, and Forgot Password views. | [x] PASS |

---

## Test Execution Command
```powershell
pnpm exec tsx scripts/test-auth-recovery.ts
```

All 5 automated steps in `scripts/test-auth-recovery.ts` and Next.js full static + dynamic production build (`pnpm run build`) passed with exit code 0.
