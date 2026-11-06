/**
 * Offline Audio & Metadata Storage using Browser IndexedDB.
 * Manages full binary audio Blobs, cover images, and book summaries for 100% offline playback.
 */

export interface OfflineBookRecord {
  id: string;
  title: string;
  author: string | null;
  category?: string | null;
  durationSeconds: number | null;
  coverUrl: string | null;
  localCoverPath: string | null;
  coverBlob?: Blob;
  audioBlob: Blob;
  sizeBytes: number;
  savedAt: number;
}

const DB_NAME = 'perblinkist-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_books';

// Memory cache of blob URLs to avoid re-generating for active session
const blobUrlCache = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Checks if a specific book summary is downloaded offline.
 */
export async function isBookDownloadedOffline(bookId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(bookId);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Fetches and saves an audiobook summary and its binary audio stream into IndexedDB.
 */
export async function downloadBookOffline(
  book: {
    id: string;
    title: string;
    author: string | null;
    category?: string | null;
    durationSeconds: number | null;
    coverUrl: string | null;
    localCoverPath: string | null;
  },
  onProgress?: (percent: number) => void
): Promise<void> {
  // 1. Fetch audio binary
  const audioResponse = await fetch(`/api/download/${book.id}`);
  if (!audioResponse.ok) {
    // Fallback to stream route if download route fails
    const fallbackResponse = await fetch(`/api/stream/${book.id}`);
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch audio stream: ${fallbackResponse.statusText}`);
    }
  }

  const responseToRead = audioResponse.ok ? audioResponse : await fetch(`/api/stream/${book.id}`);
  const contentLength = Number(responseToRead.headers.get('Content-Length')) || 0;
  
  let audioBlob: Blob;

  if (responseToRead.body && contentLength > 0 && onProgress) {
    const reader = responseToRead.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        // Ensure buffer is backed by standard ArrayBuffer for BlobPart compatibility
        chunks.push(new Uint8Array(value.buffer as ArrayBuffer, value.byteOffset, value.byteLength));
        receivedBytes += value.length;
        onProgress(Math.min(98, Math.round((receivedBytes / contentLength) * 100)));
      }
    }
    audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
  } else {
    audioBlob = await responseToRead.blob();
  }

  // 2. Fetch cover image if exists
  let coverBlob: Blob | undefined;
  const coverSrc = book.localCoverPath || book.coverUrl;
  if (coverSrc) {
    try {
      const coverRes = await fetch(coverSrc);
      if (coverRes.ok) {
        coverBlob = await coverRes.blob();
      }
    } catch {
      // Non-critical if cover fails
    }
  }

  // 3. Persist to IndexedDB
  const record: OfflineBookRecord = {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    durationSeconds: book.durationSeconds,
    coverUrl: book.coverUrl,
    localCoverPath: book.localCoverPath,
    coverBlob,
    audioBlob,
    sizeBytes: audioBlob.size + (coverBlob ? coverBlob.size : 0),
    savedAt: Date.now(),
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      if (onProgress) onProgress(100);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves the local offline Blob URL for a downloaded book, if available.
 */
export async function getOfflineAudioUrl(bookId: string): Promise<string | null> {
  if (blobUrlCache.has(bookId)) {
    return blobUrlCache.get(bookId)!;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(bookId);

      req.onsuccess = () => {
        const record = req.result as OfflineBookRecord | undefined;
        if (record && record.audioBlob) {
          const url = URL.createObjectURL(record.audioBlob);
          blobUrlCache.set(bookId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Returns all downloaded offline books with storage metrics.
 */
export async function getAllOfflineBooks(): Promise<{
  books: OfflineBookRecord[];
  totalSizeBytes: number;
}> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const books = (req.result || []) as OfflineBookRecord[];
        const totalSizeBytes = books.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
        resolve({ books, totalSizeBytes });
      };
      req.onerror = () => resolve({ books: [], totalSizeBytes: 0 });
    });
  } catch {
    return { books: [], totalSizeBytes: 0 };
  }
}

/**
 * Deletes a downloaded book from offline storage.
 */
export async function deleteOfflineBook(bookId: string): Promise<boolean> {
  if (blobUrlCache.has(bookId)) {
    URL.revokeObjectURL(blobUrlCache.get(bookId)!);
    blobUrlCache.delete(bookId);
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(bookId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Clears all downloaded offline books.
 */
export async function clearAllOfflineBooks(): Promise<boolean> {
  blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
  blobUrlCache.clear();

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
