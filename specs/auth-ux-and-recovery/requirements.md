# Requirements: Authentication UX Overhaul & Security Question Password Recovery

## 1. Problem Statement & User Experience Issues
1. **No Sign-Up Option**: Once an admin account is created, the current UI only exposes a Sign-In form. New users who do not yet have an account cannot register.
2. **No Password Recovery Mechanism**: If a user forgets their password, there is currently no way to regain access.
3. **Self-Hosted Simplicity**: Since PerBlinkist is a self-hosted, personal audiobook application (not a banking or email infrastructure), complex email SMTP setups with verification links add unnecessary setup friction for home-lab users.
   - Solution: A straightforward **Security Question & Answer** verification model (e.g. "What was the name of your first pet?", "In which city were you born?", "What was your childhood nickname?").

---

## 2. Scope & Acceptance Criteria

### Requirement 1: Mode Switching in Authentication Screen
The split-screen authentication component must provide fluid switching between three primary modes:
1. **Sign In**: Username/email + password, with links to "Don't have an account? Sign up" and "Forgot password?".
2. **Sign Up**: Username, optional email, password, selection of a security question from a standardized list, and the user's answer.
3. **Forgot Password / Recovery**:
   - Step 1: User enters username -> system retrieves their designated security question (without revealing the answer).
   - Step 2: User provides the answer -> if correct, user enters a new password.
   - Step 3: Password updated and user logged in directly.
4. **First-Run Admin Setup**: Automatically shown when 0 users exist in the database, also requiring a security question to guarantee the admin can recover access.

### Requirement 2: Security Question Storage & Case-Insensitive Matching
- In `prisma/schema.prisma`:
  - `securityQuestion`: String (the prompt selected by user)
  - `securityAnswerHash`: Bcrypt hash of normalized lowercase answer (or salted hash) to ensure privacy even in the SQLite file.

### Requirement 3: tRPC Procedures
- `auth.register`: Public procedure for new user accounts with username, password, security question, and answer.
- `auth.getSecurityQuestion`: Takes username -> returns `{ question: string }` if user exists and has a question configured.
- `auth.resetPasswordWithSecurityAnswer`: Takes username, answer, and new password -> verifies answer hash -> updates password.

### Requirement 4: Verification Suite
- Script `scripts/test-auth-recovery.ts` verifying:
  1. Standard user registration with security question.
  2. Question retrieval for valid user.
  3. Rejection of incorrect security answer.
  4. Successful password reset with correct answer.
  5. Subsequent login with the newly updated password.
