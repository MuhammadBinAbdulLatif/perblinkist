# Validation: Global Persistent Audio Player Across Routes

## 1. Automated & Production Build Checks
- Run `pnpm run build` to ensure type-safety and Turbopack partial prerender pass without errors.

## 2. Behavioral Verification
- Start playback from home page (`/`). Bottom dock appears and timer increments.
- Navigate to `/listen-later`. Verify audio continues playing with zero interruption and the bottom player bar remains docked and controllable.
- Navigate to `/book/[id]`. Verify the audio keeps playing, the bottom player is present, and the centered controls mirror the active playback time and play/pause state.
- Scrub or skip forward 30s. Verify state is reflected across both components.
- Remember: **NO GIT COMMIT OR PUSH** until explicitly commanded by user.
