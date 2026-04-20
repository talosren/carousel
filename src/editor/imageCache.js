// ---------------------------------------------------------------------------
// In-memory map of localId -> objectURL. The store only persists `localId` /
// `remoteUrl`; this cache holds the transient URL we actually set as <img src>
// for blobs loaded from IndexedDB. Lives outside the store to avoid writing
// URL strings into localStorage and to let app.js control revocation timing.
// ---------------------------------------------------------------------------

import { getImage, listImageIds } from './imageStore.js';

const cache = new Map();

export function getCachedUrl(localId) {
  if (!localId) return null;
  return cache.get(localId) ?? null;
}

export function setCachedUrl(localId, url) {
  if (!localId || !url) return;
  const prev = cache.get(localId);
  if (prev && prev !== url) {
    try {
      URL.revokeObjectURL(prev);
    } catch {}
  }
  cache.set(localId, url);
}

export function revokeCachedUrl(localId) {
  const url = cache.get(localId);
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {}
  cache.delete(localId);
}

// Loads every blob id from IndexedDB into the cache at boot. Errors are
// silently ignored so a missing DB doesn't block rendering.
export async function hydrateCache() {
  try {
    const ids = await listImageIds();
    for (const id of ids) {
      if (cache.has(id)) continue;
      try {
        const blob = await getImage(id);
        if (blob) setCachedUrl(id, URL.createObjectURL(blob));
      } catch {}
    }
  } catch {}
}

// Trim cache entries no longer referenced by any slide (and revoke their
// object URLs). Called by app.js after a state update.
export function sweep(referenced) {
  for (const id of Array.from(cache.keys())) {
    if (!referenced.has(id)) revokeCachedUrl(id);
  }
}
