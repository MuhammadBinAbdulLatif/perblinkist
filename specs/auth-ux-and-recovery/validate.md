# Validation Checklist: Authentication UX & Password Recovery

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Security Question Schema** | `securityQuestion` and `securityAnswerHash` added to `User` model. | [ ] |
| **Answer Privacy** | Answers are trimmed, lowercased, and salted with bcrypt. | [ ] |
| **New User Registration** | Standard users can sign up with username, password, and security Q&A. | [ ] |
| **Forgot Password Prompt Lookup** | System returns the user's security question without exposing the answer. | [ ] |
| **Wrong Answer Blocked** | Submitting an incorrect answer rejects the password reset with `UNAUTHORIZED`. | [ ] |
| **Successful Password Reset** | Submitting the correct answer updates the password and signs the user in. | [ ] |
| **Login with New Password** | User can sign out and log back in using the newly updated password. | [ ] |
| **UI Mode Switching** | Seamless navigation between Sign In, Sign Up, and Forgot Password views. | [ ] |

---

## Test Execution Command
```powershell
pnpm exec tsx scripts/test-auth-recovery.ts
```
