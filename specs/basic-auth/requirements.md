# Requirements: Basic Authentication & User Sessions

## 1. Objective & Problem Statement
PerBlinkist is a personal, self-hosted media server intended to run on local home networks or exposed via reverse proxies (e.g. Cloudflare Tunnels, Tailscale, Nginx).
To prevent unauthorized access to personal audio files and listening histories, the application requires classic, solid, and reliable authentication:
- Classic username/email + salted & hashed password.
- Secure, HTTP-only cookie-based session management (`token`).
- Protection of media streaming routes (`/api/stream/:id`) and catalog operations.
- First-run user onboarding: If no users exist in the SQLite database, prompt the user to register an initial Admin account.
- Flashy, modern, greenish visual style adhering to [`specs/styles.md`](file:///d:/projects/monos/perblinkist/specs/styles.md).

---

## 2. Scope & Acceptance Criteria

### Requirement 1: User & Session Data Model
- Store users in Prisma SQLite:
  - `id`: Unique identifier (cuid)
  - `username`: Unique username
  - `email`: Optional email address
  - `passwordHash`: Salted bcrypt hash
  - `isAdmin`: Boolean flag for administrative tasks (rescanning, user management)
  - `createdAt`, `updatedAt`

### Requirement 2: tRPC Auth Router & Procedures
- `auth.status`: Checks if system is initialized (has at least 1 user) and returns current active session if logged in.
- `auth.registerAdmin`: Creates the initial user (disabled once an admin exists).
- `auth.login`: Verifies credentials via `bcryptjs.compare`, issues a signed JWT, and sets an `httpOnly`, `sameSite: 'lax'` cookie.
- `auth.logout`: Clears the session cookie.
- `auth.me`: Returns current user info (`id`, `username`, `isAdmin`).

### Requirement 3: Route Protection & Streaming Security
- `/api/stream/:id`: Verifies session token from cookie before streaming audio. Unauthenticated requests receive `401 Unauthorized`.
- Non-logged-in frontend users are presented with the stylish, flashy Emerald Auth modal/screen.

### Requirement 4: UI & Styling
- Adheres strictly to [`specs/styles.md`](file:///d:/projects/monos/perblinkist/specs/styles.md):
  - Glowing radial green gradient behind a modern glassmorphic card.
  - Emerald sparkle branding logo.
  - Friendly, inviting copywriting and responsive inputs.
  - Smooth loading spinners and crisp error alerts.

### Requirement 5: Automated Verification Script
- Provide `scripts/test-auth.ts`:
  1. Tests initial setup / admin registration.
  2. Tests password verification and rejection of wrong passwords.
  3. Tests JWT token generation and validation.
  4. Tests authenticated vs unauthenticated access to audio streaming.
