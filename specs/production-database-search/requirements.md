# Requirements: Production-Ready Global Full-Text Search Across Library

## 1. Problem Statement
When scaling PerBlinkist to tens of thousands of book summaries, client-side or partial in-memory filtering fails.
Users need a true **global, server-side database search engine** accessible from any page (Home, Library Catalog, Book Detail, Listen Later) that:
1. Queries the full SQLite database across all books without loading thousands of records into the browser client.
2. Performs multi-field weighted matching across `title`, `author`, `category`, `synopsis`, and `fileName`.
3. Provides an interactive **global search overlay / modal / dropdown** (accessible anywhere via the search bar or shortcut `Ctrl+K` / `/`) showing instantaneous typeahead database results with cover posters, matched fields, authors, and duration.
4. Seamlessly routes enter / full-view queries into the paginated library catalog `/books?search=...` so users can paginate through all hundreds of matches across their collection.

## 2. User Stories & Acceptance Criteria
- **US 1 (Unified Global Database Search Procedure)**:
  - tRPC procedure `searchBooksDatabase` performing case-insensitive tokenized matching against SQLite.
  - Searches `title`, `author`, `category`, `synopsis`, and `fileName`.
  - Supports limit and relevance ordering (matches in title prioritized over matches in synopsis).
- **US 2 (Global Interactive Search Bar with Live Database Dropdown)**:
  - Mounted on all top navigation bars (`/`, `/books`, `/book/[id]`, `/listen-later`).
  - As the user types (with debouncing to protect backend performance), queries the SQLite database directly and displays rich preview results with artwork, author, duration, and one-click play.
  - Shows total matching count and "Press Enter or click to view all X results in library".
- **US 3 (Dedicated Paginated Search View)**:
  - Submitting a search query redirects to `/books?search=...`, displaying all matches in 30-per-page paginated format.
- **US 4 (Rule Compliance)**:
  - Strictly **NO GIT COMMITS OR PUSHES** unless explicitly commanded by user.
