// ---------------------------------------------------------------------------
// Image ingestion utilities — offline-first.
//
//   ingestImage(file)     puts the blob in IndexedDB, creates an in-memory
//                         objectURL, and (when online) kicks off an upload to
//                         tmpfiles. Returns { localId, objectUrl, remotePromise }.
//
//   uploadToTmpfiles(file)  POSTs to https://tmpfiles.org/api/v1/upload and
//                           returns the /dl/ URL. Only attempted when online.
// ---------------------------------------------------------------------------

import { putImage } from './imageStore.js';
import { setCachedUrl } from './imageCache.js';

const TMPFILES_ENDPOINT = 'https://tmpfiles.org/api/v1/upload';

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToTmpfiles(file) {
  if (!file) throw new Error('No file to upload');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(TMPFILES_ENDPOINT, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`tmpfiles responded ${res.status}`);
  }
  const json = await res.json();
  const viewerUrl = json?.data?.url;
  if (!viewerUrl) {
    throw new Error('tmpfiles response missing url');
  }
  // Viewer URL: https://tmpfiles.org/12345/file.jpg
  // Direct URL: https://tmpfiles.org/dl/12345/file.jpg
  const direct = viewerUrl.replace(
    /^https?:\/\/tmpfiles\.org\//,
    'https://tmpfiles.org/dl/'
  );
  return {
    url: direct,
    viewerUrl,
    expiresInMinutes: 60,
  };
}

export function isImageFile(file) {
  return !!file && /^image\//.test(file.type);
}

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Store blob + register its object URL synchronously, then optionally attempt
// tmpfiles. The returned `remotePromise` always resolves (never throws) with
// either `{ url, viewerUrl }` on success, `{ url: null, offline: true }` when
// we are offline, or `{ url: null, error }` on failure.
export async function ingestImage(file) {
  if (!isImageFile(file)) throw new Error('Not an image file');
  const localId = uuid();
  await putImage(localId, file);
  const objectUrl = URL.createObjectURL(file);
  setCachedUrl(localId, objectUrl);

  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  const remotePromise = online
    ? uploadToTmpfiles(file).catch((err) => ({
        url: null,
        error: err?.message ?? String(err),
      }))
    : Promise.resolve({ url: null, offline: true });

  return { localId, objectUrl, remotePromise };
}
