# Requirements: Audio Streaming & Static Media Server

## 1. Objective & Problem Statement
PerBlinkist is fundamentally a self-hosted audio media server (similar to Jellyfin, Navidrome, or Plex, but tailored for short-form audio summaries).
In production, a Docker container will mount a host directory of audio files as a read-only volume (`/media:ro`).

The media server must reliably stream these files over HTTP directly to web browsers and mobile clients with:
- **Instant Seeking & Scrubbing**: Users jump forward 30 seconds or scrub to minute 12 without downloading the entire 20-minute audio file first.
- **HTTP 206 Partial Content**: Full compliance with RFC 7233 byte-range specifications (`bytes=start-end/total`).
- **Support for Modern Audio Codecs**: Specifically Matroska Audio (`.mka` with Opus stream), `.opus`, `.mp3`, `.m4a` (AAC), `.ogg`, and `.flac`.
- **Docker-Ready Path Translation**: Support streaming regardless of whether running locally (relative/absolute workspace paths) or containerized (with mounted `/media` volume paths).

---

## 2. Browser Compatibility with `.mka` (Matroska / Opus)
- Modern browsers (Chrome, Edge, Firefox, modern Safari) natively support Opus inside Matroska/WebM containers when served with `audio/webm` or `audio/x-matroska`.
- Serving standard `audio/webm; codecs=opus` or `audio/x-matroska` with accurate `Accept-Ranges: bytes` allows HTML5 `<audio>` elements to scrub, buffer, and play seamlessly.

---

## 3. Acceptance Criteria

### Requirement 1: Robust Byte-Range Streaming Route Handler
- The endpoint `/api/stream/[id]` must inspect the incoming `Range` header (e.g. `bytes=1048576-2097151` or `bytes=0-`).
- Return status **`206 Partial Content`** when `Range` header is present.
- Provide proper response headers:
  - `Content-Range: bytes <start>-<end>/<totalSize>`
  - `Accept-Ranges: bytes`
  - `Content-Length: <chunkSize>`
  - `Content-Type: <mimeType>` (with correct container/codec specification)
  - `Cache-Control: no-cache` (or range-caching policy)
- Handle edge cases:
  - Out of bounds ranges return `416 Range Not Satisfiable` with `Content-Range: bytes */<totalSize>`.
  - Missing `Range` header serves `200 OK` with full stream and `Accept-Ranges: bytes`.

### Requirement 2: Static Media Directory Fallback & Read-Only Docker Mount
- If the database has a path registered during testing (e.g. `example-files/...`), or in Docker (`/media/...`), the streaming resolver must check both the stored path and the active `MEDIA_DIR` environment variable to ensure zero broken links across environments.

### Requirement 3: Automated Verification
- Provide a dedicated test script (`scripts/test-stream.ts`) verifying:
  1. `GET /api/stream/:id` without Range -> returns `200 OK` with `Accept-Ranges: bytes`.
  2. `GET /api/stream/:id` with `Range: bytes=0-1024` -> returns `206 Partial Content` with `Content-Length: 1025` and `Content-Range: bytes 0-1024/<size>`.
  3. `GET /api/stream/:id` with out-of-range byte -> returns `416 Range Not Satisfiable`.
