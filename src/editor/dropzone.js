// ---------------------------------------------------------------------------
// Drag-and-drop glue.
//   attachViewportDropzone(viewport, getCurrentIndex)
//     Drops anywhere on the carousel viewport target the currently visible
//     slide. Shows an overlay hint while dragging.
//   applyImageToSlide(slideIndex, file, onStatus)
//     Writes the blob to IndexedDB, patches slide.image with localId, and
//     (when online) attempts tmpfiles in the background.
// ---------------------------------------------------------------------------

import { updateSlide, updateStepImage, getState, patchBrandOnTheme } from '../store.js';
import { ingestImage, isImageFile } from './upload.js';

// Records the in-flight remotePromise per slide index so a later drop on the
// same slide doesn't clobber a still-pending response.
const pendingUploads = new Map();

export async function applyImageToSlide(slideIndex, file, onStatus) {
  if (!isImageFile(file)) {
    onStatus?.({ state: 'error', message: 'Not an image file' });
    return;
  }
  const current = getState().slides[slideIndex];
  const existingPlacement = current?.image?.placement ?? 'inline';

  try {
    const { localId, remotePromise } = await ingestImage(file);
    updateSlide(slideIndex, {
      image: {
        localId,
        remoteUrl: null,
        placement: existingPlacement,
        alt: current?.image?.alt ?? '',
      },
    });
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    onStatus?.({
      state: online ? 'uploading' : 'offline',
      message: online ? 'Uploading to tmpfiles\u2026' : 'Offline \u2014 saved locally',
    });

    const token = Symbol('upload');
    pendingUploads.set(slideIndex, token);
    const result = await remotePromise;
    if (pendingUploads.get(slideIndex) !== token) return;
    pendingUploads.delete(slideIndex);

    if (result?.url) {
      updateSlide(slideIndex, { image: { remoteUrl: result.url } });
      onStatus?.({
        state: 'uploaded',
        message: 'Shared (link expires in 60 min)',
        url: result.url,
      });
    } else if (result?.offline) {
      onStatus?.({
        state: 'offline',
        message: 'Offline \u2014 not shared',
      });
    } else {
      onStatus?.({
        state: 'error',
        message: result?.error ?? 'Upload failed',
      });
    }
  } catch (err) {
    onStatus?.({ state: 'error', message: err.message ?? String(err) });
  }
}

// Best-effort: when the browser comes back online, try tmpfiles again for any
// slide that has a localId but no remoteUrl. Called once from app.js.
export function attachOnlineRetry() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    const slides = getState().slides;
    slides.forEach((slide, i) => {
      const img = slide?.image;
      if (img?.localId && !img.remoteUrl) {
        retryUpload(i, img.localId);
      }
      if (Array.isArray(slide?.steps)) {
        for (const st of slide.steps) {
          if (!Array.isArray(st.images)) continue;
          for (const stepImg of st.images) {
            if (stepImg.localId && !stepImg.remoteUrl) {
              retryStepImageUpload(i, st.id, stepImg.id, stepImg.localId);
            }
          }
        }
      }
    });
    getState().themes.forEach((t) => {
      const b = t.brand;
      if (b?.avatarLocalId && !b.avatarRemoteUrl) {
        retryBrandAvatar(t.id, b.avatarLocalId);
      }
    });
  });
}

async function retryUpload(slideIndex, localId) {
  try {
    const { getImage } = await import('./imageStore.js');
    const blob = await getImage(localId);
    if (!blob) return;
    const { uploadToTmpfiles } = await import('./upload.js');
    const result = await uploadToTmpfiles(blob).catch(() => null);
    if (result?.url) {
      updateSlide(slideIndex, { image: { remoteUrl: result.url } });
    }
  } catch {}
}

async function retryStepImageUpload(slideIndex, stepId, imageId, localId) {
  try {
    const { getImage } = await import('./imageStore.js');
    const blob = await getImage(localId);
    if (!blob) return;
    const { uploadToTmpfiles } = await import('./upload.js');
    const result = await uploadToTmpfiles(blob).catch(() => null);
    if (result?.url) {
      updateStepImage(slideIndex, stepId, imageId, { remoteUrl: result.url });
    }
  } catch {}
}

async function retryBrandAvatar(themeId, localId) {
  try {
    const { getImage } = await import('./imageStore.js');
    const blob = await getImage(localId);
    if (!blob) return;
    const { uploadToTmpfiles } = await import('./upload.js');
    const result = await uploadToTmpfiles(blob).catch(() => null);
    if (result?.url) {
      patchBrandOnTheme(themeId, { avatarRemoteUrl: result.url });
    }
  } catch {}
}

export function attachViewportDropzone(viewport, getCurrentIndex) {
  let depth = 0;

  const hasImage = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  viewport.addEventListener('dragenter', (e) => {
    if (!hasImage(e)) return;
    e.preventDefault();
    depth += 1;
    viewport.classList.add('is-drop-target');
  });
  viewport.addEventListener('dragover', (e) => {
    if (!hasImage(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  viewport.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) viewport.classList.remove('is-drop-target');
  });
  viewport.addEventListener('drop', async (e) => {
    if (!hasImage(e)) return;
    e.preventDefault();
    depth = 0;
    viewport.classList.remove('is-drop-target');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const idx = getCurrentIndex();
    await applyImageToSlide(idx, file);
  });
}
