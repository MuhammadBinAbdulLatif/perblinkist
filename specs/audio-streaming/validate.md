# Validation Checklist: Audio Streaming & Static Media Server

## Validation Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Full File Stream (HTTP 200)** | Request without `Range` header returns `200 OK`, `Accept-Ranges: bytes`, full `Content-Length`. | [x] Passed (200 OK, full Content-Length) |
| **Initial Audio Probe (HTTP 206)** | Request with `Range: bytes=0-1024` returns `206 Partial Content`, `Content-Length: 1025`, `Content-Range: bytes 0-1024/<totalSize>`. | [x] Passed (206, 1025 bytes chunk) |
| **Mid-Stream Seek (HTTP 206)** | Request with `Range: bytes=1000000-2000000` returns `206 Partial Content`, `Content-Length: 1000001`, `Content-Range: bytes 1000000-2000000/<totalSize>`. | [x] Passed (206, mid-stream seek) |
| **Open-Ended Seek (HTTP 206)** | Request with `Range: bytes=1000000-` returns bytes from 1000000 to EOF. | [x] Passed (206, bytes to EOF) |
| **Invalid Range (HTTP 416)** | Request with `Range: bytes=999999999-` beyond file size returns `416 Range Not Satisfiable` with `Content-Range: bytes */<totalSize>`. | [x] Passed (416 Range Not Satisfiable) |
| **MIME Type for Matroska / Opus** | `.mka` files return `audio/webm; codecs=opus` or `audio/x-matroska`. | [x] Passed (`audio/webm; codecs=opus`) |
| **Stream Performance** | Streams directly from disk with zero memory buffering. | [x] Passed (Readable.toWeb kernel streaming) |

---

## Automated Test Command
```powershell
pnpm exec tsx scripts/test-stream.ts
```
