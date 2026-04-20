// ---------------------------------------------------------------------------
// Reactive store v2 — single source of truth.
//
// state = {
//   version: 2,
//   themes: Theme[],            // theme library (see src/theme.js)
//   activeThemeId: string,
//   slides: Slide[],
// }
//
// Image blobs are not stored here; they live in IndexedDB keyed by
// `slide.image.localId`. Objects URLs (for rendering) are managed outside the
// store in src/app.js imageCache. This keeps localStorage small and lets the
// app work offline.
// ---------------------------------------------------------------------------

import { slides as DEFAULT_SLIDES } from './data/slides.js';
import { DEFAULT_THEMES, notionTheme, blankTokens, TOKEN_KEYS } from './theme.js';
import { putImage, deleteImage } from './editor/imageStore.js';

const STORAGE_KEY = 'carousel.state.v2';
const LEGACY_KEY = 'carousel.state.v1';

function makeInitialState() {
  return {
    version: 2,
    themes: deepClone(DEFAULT_THEMES),
    activeThemeId: notionTheme.id,
    slides: deepClone(DEFAULT_SLIDES).map(normaliseSlide),
  };
}

let state = makeInitialState();
const listeners = new Set();
let ready = false;

// Invoked by src/app.js before first render. Loads persisted state, runs
// migrations, moves legacy data-URL images into IndexedDB. Never throws;
// falls back to defaults on any failure.
export async function initStore() {
  if (ready) return state;
  try {
    const raw =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(LEGACY_KEY))) ||
      null;
    if (raw) {
      const parsed = JSON.parse(raw);
      state = await migrate(parsed);
    }
  } catch (err) {
    console.warn('[carousel] store hydrate failed, using defaults', err);
    state = makeInitialState();
  }
  ready = true;
  // Write back the (possibly migrated) slim state.
  persist(state);
  return state;
}

export function getState() {
  return state;
}

export function getActiveTheme() {
  return (
    state.themes.find((t) => t.id === state.activeThemeId) ?? state.themes[0]
  );
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit() {
  persist(state);
  for (const fn of listeners) fn(state);
}

// ----------------------------- Slide mutators ------------------------------

export function addSlide(type = 'features', atIndex) {
  const at = clampInsert(atIndex, state.slides.length);
  state.slides = [
    ...state.slides.slice(0, at),
    normaliseSlide(blankSlide(type)),
    ...state.slides.slice(at),
  ];
  commit();
  return at;
}

export function deleteSlide(index) {
  if (state.slides.length <= 1) return;
  const removed = state.slides[index];
  for (const id of collectImageLocalIds(removed)) {
    deleteImage(id).catch(() => {});
  }
  state.slides = state.slides.filter((_, i) => i !== index);
  commit();
}

export function duplicateSlide(index) {
  const src = state.slides[index];
  if (!src) return;
  const copy = deepClone(src);
  // Duplicated slides share the same localId (both reference the same blob);
  // that's fine because we don't own delete until BOTH references go away.
  // To keep the simple "delete on remove" rule we null out image refs on dupes.
  if (copy.image) copy.image = undefined;
  if (Array.isArray(copy.steps)) {
    copy.steps = copy.steps.map((st) => ({ ...st, images: undefined }));
  }
  state.slides = [
    ...state.slides.slice(0, index + 1),
    copy,
    ...state.slides.slice(index + 1),
  ];
  commit();
}

export function moveSlide(index, direction) {
  const j = index + direction;
  if (j < 0 || j >= state.slides.length) return;
  const next = [...state.slides];
  [next[index], next[j]] = [next[j], next[index]];
  state.slides = next;
  commit();
}

export function updateSlide(index, patch) {
  const current = state.slides[index];
  if (!current) return;
  const merged = { ...current, ...patch };

  // image: nested shallow-merge, `null` clears it.
  if (patch.image !== undefined) {
    if (patch.image === null) {
      if (current.image?.localId) {
        deleteImage(current.image.localId).catch(() => {});
      }
      merged.image = undefined;
    } else {
      merged.image = { ...(current.image ?? {}), ...patch.image };
    }
  }

  // colors: nested shallow-merge, undefined keys are removed (to fall back to
  // the theme default).
  if (patch.colors !== undefined) {
    if (patch.colors === null) {
      merged.colors = undefined;
    } else {
      const next = { ...(current.colors ?? {}) };
      for (const [k, v] of Object.entries(patch.colors)) {
        if (v === undefined || v === null || v === '') delete next[k];
        else next[k] = v;
      }
      merged.colors = Object.keys(next).length ? next : undefined;
    }
  }

  // If the image placement transitioned to 'content' and blocks is missing,
  // auto-seed a sane layout: [text(body), image]. Keep existing blocks if any.
  if (merged.image?.placement === 'content' && !Array.isArray(merged.blocks)) {
    merged.blocks = seedBlocksFromSlide(merged);
  }

  state.slides = state.slides.map((s, i) => (i === index ? merged : s));
  commit();
}

// ----------------------------- Block mutators ------------------------------

// Content-blocks model: slide.blocks is an ordered array of
//   { id, type: 'text' | 'image', text?: string }
// Only one image block per slide (references slide.image). Blocks are used
// only when slide.image.placement === 'content'; other placements ignore them.

export function addBlock(slideIndex, block, atIndex) {
  const slide = state.slides[slideIndex];
  if (!slide) return;
  const list = Array.isArray(slide.blocks) ? [...slide.blocks] : [];
  // Enforce single image block invariant.
  if (block.type === 'image' && list.some((b) => b.type === 'image')) return;
  const normalised = { id: block.id ?? uuid(), ...block };
  const at = clampInsert(atIndex, list.length);
  list.splice(at, 0, normalised);
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, blocks: list } : s
  );
  commit();
}

export function updateBlock(slideIndex, blockId, patch) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.blocks)) return;
  const list = slide.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, blocks: list } : s
  );
  commit();
}

export function moveBlock(slideIndex, blockId, direction) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.blocks)) return;
  const from = slide.blocks.findIndex((b) => b.id === blockId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= slide.blocks.length) return;
  const list = [...slide.blocks];
  [list[from], list[to]] = [list[to], list[from]];
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, blocks: list } : s
  );
  commit();
}

export function removeBlock(slideIndex, blockId) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.blocks)) return;
  const list = slide.blocks.filter((b) => b.id !== blockId);
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, blocks: list.length ? list : undefined } : s
  );
  commit();
}

// -------------------------- Step image mutators ---------------------------

// Per-step images on `howto` slides. `step.images` is an ordered array of
// `{ id, localId?, remoteUrl?, alt? }`. Images in IndexedDB are deleted when
// their step image entry is removed (or the whole slide is deleted).

export function addStepImage(slideIndex, stepId, image) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.steps)) return;
  const steps = slide.steps.map((st) => {
    if (st.id !== stepId) return st;
    const list = Array.isArray(st.images) ? [...st.images] : [];
    list.push({ id: image?.id ?? uuid(), ...image });
    return { ...st, images: list };
  });
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, steps } : s
  );
  commit();
}

export function updateStepImage(slideIndex, stepId, imageId, patch) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.steps)) return;
  const steps = slide.steps.map((st) => {
    if (st.id !== stepId || !Array.isArray(st.images)) return st;
    const images = st.images.map((img) =>
      img.id === imageId ? { ...img, ...patch } : img
    );
    return { ...st, images };
  });
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, steps } : s
  );
  commit();
}

export function moveStepImage(slideIndex, stepId, imageId, direction) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.steps)) return;
  const steps = slide.steps.map((st) => {
    if (st.id !== stepId || !Array.isArray(st.images)) return st;
    const from = st.images.findIndex((img) => img.id === imageId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= st.images.length) return st;
    const images = [...st.images];
    [images[from], images[to]] = [images[to], images[from]];
    return { ...st, images };
  });
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, steps } : s
  );
  commit();
}

export function removeStepImage(slideIndex, stepId, imageId) {
  const slide = state.slides[slideIndex];
  if (!slide || !Array.isArray(slide.steps)) return;
  let removedLocalId = null;
  const steps = slide.steps.map((st) => {
    if (st.id !== stepId || !Array.isArray(st.images)) return st;
    const target = st.images.find((img) => img.id === imageId);
    if (target?.localId) removedLocalId = target.localId;
    const images = st.images.filter((img) => img.id !== imageId);
    return { ...st, images: images.length ? images : undefined };
  });
  if (removedLocalId) deleteImage(removedLocalId).catch(() => {});
  state.slides = state.slides.map((s, i) =>
    i === slideIndex ? { ...s, steps } : s
  );
  commit();
}

// ----------------------------- Theme mutators ------------------------------

export function setActiveTheme(id) {
  if (!state.themes.some((t) => t.id === id)) return;
  state.activeThemeId = id;
  commit();
}

export function createTheme(seed) {
  const base = seed ?? cloneActive();
  const theme = {
    ...deepClone(base),
    id: `theme-${uuid()}`,
    name: seed?.name ?? 'New theme',
  };
  state.themes = [...state.themes, theme];
  state.activeThemeId = theme.id;
  commit();
  return theme.id;
}

export function duplicateTheme(id) {
  const src = state.themes.find((t) => t.id === id);
  if (!src) return;
  const copy = {
    ...deepClone(src),
    id: `theme-${uuid()}`,
    name: `${src.name} copy`,
  };
  // Fresh upload id per duplicate — avoids two themes sharing one IndexedDB blob.
  if (copy.brand && copy.brand.avatarLocalId) {
    copy.brand = { ...copy.brand, avatarLocalId: undefined };
  }
  const idx = state.themes.findIndex((t) => t.id === id);
  state.themes = [
    ...state.themes.slice(0, idx + 1),
    copy,
    ...state.themes.slice(idx + 1),
  ];
  state.activeThemeId = copy.id;
  commit();
  return copy.id;
}

export function renameTheme(id, name) {
  state.themes = state.themes.map((t) => (t.id === id ? { ...t, name } : t));
  commit();
}

export function deleteTheme(id) {
  if (state.themes.length <= 1) return;
  const removed = state.themes.find((t) => t.id === id);
  const avatarId = removed?.brand?.avatarLocalId;
  const stillUsed =
    avatarId &&
    state.themes.some(
      (t) => t.id !== id && t.brand?.avatarLocalId === avatarId
    );
  if (avatarId && !stillUsed) deleteImage(avatarId).catch(() => {});
  state.themes = state.themes.filter((t) => t.id !== id);
  if (state.activeThemeId === id) {
    state.activeThemeId = state.themes[0].id;
  }
  commit();
}

export function updateActiveTheme(patch) {
  const id = state.activeThemeId;
  state.themes = state.themes.map((t) => {
    if (t.id !== id) return t;
    const next = { ...t };
    if (patch.brand) next.brand = { ...t.brand, ...patch.brand };
    if (patch.caption) next.caption = { ...(t.caption ?? {}), ...patch.caption };
    if (patch.colors) next.colors = { ...t.colors, ...patch.colors };
    if (patch.fonts) next.fonts = { ...t.fonts, ...patch.fonts };
    if (patch.name !== undefined) next.name = patch.name;
    return next;
  });
  commit();
}

export function updateActiveTokens(mode, patch) {
  const id = state.activeThemeId;
  state.themes = state.themes.map((t) => {
    if (t.id !== id) return t;
    const nextTokens = {
      ...t.tokens,
      [mode]: { ...(t.tokens?.[mode] ?? {}), ...patch },
    };
    return { ...t, tokens: nextTokens };
  });
  commit();
}

export function exportTheme(id) {
  const theme = state.themes.find((t) => t.id === id) ?? getActiveTheme();
  return JSON.stringify(theme, null, 2);
}

export function importTheme(str) {
  const parsed = JSON.parse(str);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid theme JSON');
  const theme = {
    ...parsed,
    id: `theme-${uuid()}`,
    name: parsed.name ?? 'Imported theme',
    tokens: parsed.tokens ?? blankTokens(),
  };
  state.themes = [...state.themes, theme];
  state.activeThemeId = theme.id;
  commit();
  return theme.id;
}

// --------------------------- Legacy brand helpers --------------------------
// Kept so old call sites in the editor panel still work; they target whatever
// theme is currently active.

export function updateBrand(patch) {
  updateActiveTheme({ brand: patch });
}

/** Patch `brand` on a specific theme (used for background avatar upload completion). */
export function patchBrandOnTheme(themeId, patch) {
  state.themes = state.themes.map((t) => {
    if (t.id !== themeId) return t;
    return { ...t, brand: { ...t.brand, ...patch } };
  });
  commit();
}

export function updateCaption(patch) {
  updateActiveTheme({ caption: patch });
}

export function updateColors(patch) {
  updateActiveTheme({ colors: patch });
}

// ----------------------------- Global actions ------------------------------

export function resetDefaults() {
  // Best-effort: remove any blobs referenced by the current state; ignored
  // if IndexedDB hasn't opened yet.
  for (const s of state.slides) {
    for (const id of collectImageLocalIds(s)) {
      deleteImage(id).catch(() => {});
    }
  }
  for (const t of state.themes) {
    const bid = t.brand?.avatarLocalId;
    if (bid) deleteImage(bid).catch(() => {});
  }
  state = makeInitialState();
  commit();
}

// Collects every IndexedDB localId referenced by a slide (top-level image
// plus any per-step images). Used for cleanup on delete/reset.
export function collectImageLocalIds(slide) {
  const ids = [];
  if (slide?.image?.localId) ids.push(slide.image.localId);
  if (Array.isArray(slide?.steps)) {
    for (const st of slide.steps) {
      if (!Array.isArray(st?.images)) continue;
      for (const img of st.images) {
        if (img?.localId) ids.push(img.localId);
      }
    }
  }
  return ids;
}

/** All IndexedDB `localId`s still referenced by slides or any theme's brand avatar. */
export function collectAllReferencedImageLocalIds(state) {
  const ids = new Set();
  if (Array.isArray(state?.slides)) {
    for (const s of state.slides) {
      for (const id of collectImageLocalIds(s)) ids.add(id);
    }
  }
  if (Array.isArray(state?.themes)) {
    for (const t of state.themes) {
      const bid = t.brand?.avatarLocalId;
      if (bid) ids.add(bid);
    }
  }
  return ids;
}

export function toJSON() {
  return JSON.stringify(state, null, 2);
}

export function loadJSON(str) {
  const parsed = JSON.parse(str);
  if (!parsed || !Array.isArray(parsed.slides) || (!parsed.themes && !parsed.theme)) {
    throw new Error('Invalid carousel JSON');
  }
  state = normaliseState(parsed);
  commit();
}

// ------------------------------ Migration ----------------------------------

async function migrate(parsed) {
  if (parsed?.version === 2 && Array.isArray(parsed.themes) && parsed.activeThemeId) {
    return normaliseState(parsed);
  }
  // Assume v1: { slides, theme }.
  const next = makeInitialState();
  if (parsed?.theme) {
    const migratedTheme = {
      ...parsed.theme,
      id: 'theme-migrated',
      name: parsed.theme.name ?? 'My theme',
      tokens: parsed.theme.tokens ?? blankTokens(),
    };
    next.themes = [migratedTheme, ...DEFAULT_THEMES];
    next.activeThemeId = migratedTheme.id;
  }
  if (Array.isArray(parsed?.slides)) {
    next.slides = parsed.slides.map(normaliseSlide);
    // Move any data-URL images into IndexedDB.
    await Promise.all(
      next.slides.map(async (slide) => {
        const img = slide.image;
        if (!img) return;
        if (img.localId) return;
        if (typeof img.src === 'string' && img.src.startsWith('data:')) {
          try {
            const blob = await dataUrlToBlob(img.src);
            const localId = uuid();
            await putImage(localId, blob);
            slide.image = {
              localId,
              remoteUrl: img.remoteUrl ?? null,
              placement: img.placement ?? 'inline',
              alt: img.alt ?? '',
            };
          } catch (err) {
            console.warn('[carousel] failed to migrate legacy image', err);
            slide.image = undefined;
          }
        } else {
          slide.image = undefined;
        }
      })
    );
  }
  return next;
}

function normaliseState(s) {
  const normalised = {
    version: 2,
    themes: Array.isArray(s.themes) && s.themes.length ? s.themes : deepClone(DEFAULT_THEMES),
    activeThemeId: s.activeThemeId,
    slides: Array.isArray(s.slides) ? s.slides.map(normaliseSlide) : makeInitialState().slides,
  };
  if (!normalised.themes.some((t) => t.id === normalised.activeThemeId)) {
    normalised.activeThemeId = normalised.themes[0].id;
  }
  return normalised;
}

function normaliseSlide(slide) {
  const out = { ...slide };
  if (!out.id) out.id = `slide-${uuid()}`;
  if (Array.isArray(out.pills)) {
    out.pills = out.pills.map((p) =>
      typeof p === 'string' ? { text: p } : { text: p?.text ?? '', ...p }
    );
  }
  if (Array.isArray(out.items)) {
    out.items = out.items.map((it) => ({
      icon: it?.icon ?? '◇',
      label: it?.label ?? '',
      description: it?.description ?? '',
      ...it,
    }));
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.map((st) => {
      const base = {
        id: st?.id ?? uuid(),
        number: st?.number ?? undefined,
        title: st?.title ?? '',
        description: st?.description ?? '',
        ...st,
      };
      if (Array.isArray(base.images)) {
        const images = base.images
          .map((img) => {
            if (!img) return null;
            if (!img.localId && !img.remoteUrl) return null;
            return {
              id: img.id ?? uuid(),
              ...(img.localId ? { localId: img.localId } : {}),
              ...(img.remoteUrl ? { remoteUrl: img.remoteUrl } : {}),
              alt: img.alt ?? '',
            };
          })
          .filter(Boolean);
        base.images = images.length ? images : undefined;
      }
      return base;
    });
  }
  if (out.image) {
    if (!out.image.localId && !out.image.remoteUrl && !out.image.src) {
      out.image = undefined;
    } else {
      // Legacy 'replace' is subsumed by the flexible content-blocks model.
      const placement = out.image.placement === 'replace'
        ? 'content'
        : (out.image.placement ?? 'inline');
      out.image = { ...out.image, placement };
    }
  }
  if (Array.isArray(out.blocks)) {
    let sawImage = false;
    out.blocks = out.blocks
      .map((b) => {
        if (!b || (b.type !== 'text' && b.type !== 'image')) return null;
        if (b.type === 'image') {
          if (sawImage) return null; // enforce single image block
          sawImage = true;
          return { id: b.id ?? uuid(), type: 'image' };
        }
        return { id: b.id ?? uuid(), type: 'text', text: b.text ?? '' };
      })
      .filter(Boolean);
    if (!out.blocks.length) out.blocks = undefined;
  }
  // If this slide is in content placement but blocks is missing, seed a
  // default layout so the user isn't left with a blank content area.
  if (out.image?.placement === 'content' && !Array.isArray(out.blocks)) {
    out.blocks = seedBlocksFromSlide(out);
  }
  if (out.colors && typeof out.colors === 'object') {
    // Drop unknown/empty keys.
    const next = {};
    for (const k of TOKEN_KEYS) {
      const v = out.colors[k];
      if (v) next[k] = v;
    }
    out.colors = Object.keys(next).length ? next : undefined;
  }
  return out;
}

function seedBlocksFromSlide(slide) {
  const blocks = [];
  blocks.push({ id: uuid(), type: 'text', text: slide.body ?? '' });
  blocks.push({ id: uuid(), type: 'image' });
  return blocks;
}

// ---------------------------- Persistence ----------------------------------

function persist(data) {
  try {
    const slim = slimForStorage(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    // Clean up the legacy key once we have v2 saved.
    if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY);
  } catch (err) {
    console.warn('[carousel] localStorage persist failed', err);
  }
}

function slimForStorage(data) {
  return {
    ...data,
    slides: data.slides.map((s) => {
      const slim = { ...s };
      if (s.image) {
        const { localId, remoteUrl, placement, alt } = s.image;
        if (localId || remoteUrl) {
          slim.image = {
            ...(localId ? { localId } : {}),
            ...(remoteUrl ? { remoteUrl } : {}),
            placement: placement ?? 'inline',
            alt: alt ?? '',
          };
        } else {
          delete slim.image;
        }
      }
      if (Array.isArray(s.steps)) {
        slim.steps = s.steps.map((st) => {
          if (!Array.isArray(st.images) || !st.images.length) return st;
          const images = st.images
            .filter((img) => img.localId || img.remoteUrl)
            .map((img) => ({
              id: img.id,
              ...(img.localId ? { localId: img.localId } : {}),
              ...(img.remoteUrl ? { remoteUrl: img.remoteUrl } : {}),
              alt: img.alt ?? '',
            }));
          return { ...st, images: images.length ? images : undefined };
        });
      }
      return slim;
    }),
  };
}

// ------------------------------- Helpers -----------------------------------

function blankSlide(type) {
  const base = {
    type,
    theme: type === 'solution' || type === 'cta' ? 'brand' : 'light',
    tag: 'NEW SLIDE',
    heading: 'New heading',
    body: '',
  };
  switch (type) {
    case 'hero':
      return { ...base, heading: 'New hero', body: 'Supporting line.', watermark: true };
    case 'problem':
      return { ...base, theme: 'dark', tag: 'THE PROBLEM', heading: 'Describe the pain', pills: [] };
    case 'solution':
      return {
        ...base,
        tag: 'THE ANSWER',
        heading: 'Your solution in one line',
        quote: { label: 'Quote', text: '' },
      };
    case 'features':
      return {
        ...base,
        tag: 'WHAT YOU GET',
        heading: 'Feature list heading',
        items: [{ icon: '◇', label: 'Feature', description: 'Short description.' }],
      };
    case 'details':
      return { ...base, theme: 'dark', tag: 'DETAILS', heading: 'Details heading', swatches: [], tags: [] };
    case 'howto':
      return {
        ...base,
        tag: 'HOW IT WORKS',
        heading: 'Steps heading',
        steps: [{ title: 'Step one', description: 'What happens.' }],
      };
    case 'quote':
      return { ...base, text: 'Pull quote goes here.', attribution: { name: '', role: '' } };
    case 'cta':
      return {
        ...base,
        theme: 'brand',
        tag: 'START FREE',
        heading: 'Your final call to action',
        body: '',
        watermark: true,
        cta: { text: 'Get started \u2192', href: '#' },
      };
    default:
      return base;
  }
}

function clampInsert(at, length) {
  if (at === undefined || at === null) return length;
  return Math.max(0, Math.min(length, at));
}

function cloneActive() {
  return deepClone(getActiveTheme());
}

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
