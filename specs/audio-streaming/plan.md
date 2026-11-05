# Implementation Plan: Audio Streaming & Static Media Server

## 1. Architectural Strategy
Node.js via Next.js Route Handlers provides high-throughput stream handling via native Node.js streams (`fs.createReadStream`) piped to Web ReadableStream (`ReadableStream.from(nodeStream)`). This ensures:
- **Zero Memory Buffering**: Audio chunks are streamed directly from kernel disk cache to the HTTP socket without loading large audio files into Node.js heap memory.
- **Fast Seeking**: The OS kernel performs `fseek`/byte offset reads directly.

---

## 2. Media Type & MIME Mapping
Support all current and future formats:
```ts
const MIME_MAP: Record<string, string> = {
  '.mka': 'audio/webm; codecs=opus', // Optimal for Chrome/Edge/Firefox Opus playback
  '.opus': 'audio/ogg; codecs=opus',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
};
```

---

## 3. Path Resolution Strategy for Local & Docker
Audio paths may be:
1. Direct absolute path on host.
2. Direct path stored in database (`book.filePath`).
3. Relative path mapped against `process.env.MEDIA_DIR` or `/media` mount.

Resolver logic:
```ts
function resolveAudioFilePath(storedPath: string): string | null {
  if (fs.existsSync(storedPath)) return storedPath;
  const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
  const baseName = path.basename(storedPath);
  const fallback = path.join(mediaDir, baseName);
  if (fs.existsSync(fallback)) return fallback;
  return null;
}
```

---

## 4. Range Header Parser
- Parse syntax `bytes=<start>-<end>`.
- If `<end>` is omitted (e.g. `bytes=1000-`), set `<end> = totalSize - 1`.
- Bound chunk sizes to avoid overwhelming single-chunk transfers if needed, but allow client-specified chunks up to 2MB.

---

## 5. Verification Test Suite (`scripts/test-stream.ts`)
Write an automated Node.js test simulating browser audio requests:
1. Connect to SQLite via Prisma to pick the first indexed book.
2. Directly execute HTTP Range verification against the streaming handler logic.
3. Assert status codes, byte chunk lengths, and `Content-Range` headers.
