// ---------------------------------------------------------------------------
// IndexedDB wrapper for image blobs.
// One database, one object store keyed by localId (string).
// All APIs are promise-based; failures reject so callers can catch.
// ---------------------------------------------------------------------------

const DB_NAME = 'carousel-images';
const DB_VERSION = 1;
const STORE = 'blobs';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.reject(new Error('IndexedDB unavailable'));
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode) {
  return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function putImage(localId, blob) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(blob, localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getImage(localId) {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(localId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(localId) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listImageIds() {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}
