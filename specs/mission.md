# Mission & Product Vision: PerBlinkist

## 1. Problem Statement
Self-hosting thousands of short-form audio summaries (e.g. Blinkist-style book summaries, 15–30 minute bites) in generic media managers like Audiobookshelf, Plex, or podcast managers is painful and clunky:
- **Clunky Cataloging & UI**: Podcast feeds fail when forced to load thousands of audio files at once. Audiobookshelf treats each file as a massive full-length audiobook without short-form discovery patterns.
- **Manual Metadata Burden**: Users have directories with thousands of audio files (often named like `Atomic Habits - James Clear.mp3` or `Thinking Fast and Slow.m4a`). Manually tagging metadata, covers, and descriptions takes forever.
- **No Discovery or Delight**: Self-hosted managers lack recommendation engines, smart randomized carousels, genre breakdowns, and clean audio players designed specifically for snappy, short summary listening.

---

## 2. Product Vision
**PerBlinkist** is a lightweight, modern, open-source, self-hosted web application tailored exclusively for curated audiobook and book summary libraries. 

It delivers the polished, premium user experience of commercial platforms like Blinkist or Shortform, built around two fundamental core pillars:

1. **Zero-Friction Ingestion (Point & Play)**: 
   - Audio files are **provided via mounted directories**, not manually uploaded one-by-one through a browser interface.
   - Simply point the application (via Docker volume) to an existing directory of thousands of audio files.
2. **Automated Metadata & Cover Fetching (Open APIs)**:
   - File names and clean title heuristics automatically query open APIs (Google Books API, Open Library API).
   - Rich metadata—book titles, author names, high-resolution cover posters, categories, descriptions, publication years—is indexed and cached locally in an embedded database.

---

## 3. Target Audience & Core Value Propositions
- **Self-Hosters & Home-Lab Enthusiasts**: Want a containerized solution (`docker-compose up -d`) with minimal memory and CPU overhead.
- **Lifelong Learners & Book Summary Consumers**: Desire a clean, aesthetic dashboard that lets them drop in, pick a book summary spontaneously, and listen seamlessly.
- **Zero-Maintenance Cataloging**: Scan once, match background jobs reliably, handle edge cases with manual override if needed, but 95%+ zero-touch automation.

---

## 4. Key Guiding Principles
- **Speed & Snappiness**: The web app must feel instant. Heavy metadata is indexed in SQLite and served through lightweight API endpoints with cached covers.
- **Audio-First Player**: Integrated continuous playback, speed controls (1x, 1.25x, 1.5x, 2x), playback progress tracking, and history.
- **Resilient Matching**: File names often include quirks (`[Summary] Atomic Habits by James Clear (128kbps).mp3`). Regex cleaning and multi-strategy API fallback ensure high matching rates without human intervention.
- **Privacy & Ownership**: Fully offline playback once metadata/posters are cached. No telemetry or lock-in.
