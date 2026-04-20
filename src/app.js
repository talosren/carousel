// ---------------------------------------------------------------------------
// App bootstrap — glues the reactive store, editor panel, carousel, and
// viewport drag-drop together. Awaits store migration (and IndexedDB image
// rehydration) before the first render so offline images come back instantly.
// ---------------------------------------------------------------------------

import { applyTheme } from './theme.js';
import {
  getState,
  getActiveTheme,
  initStore,
  subscribe as subscribeState,
  collectAllReferencedImageLocalIds,
} from './store.js';
import {
  getIndex as getSelectedIndex,
  setIndex as setSelectedIndex,
  subscribe as subscribeSelection,
} from './editor/selection.js';

import { initCarousel } from './carousel.js';
import { progressBar, slideStyle, swipeArrow } from './components/chrome.js';
import {
  renderHeader,
  renderActions,
  renderCaption,
  renderDots,
} from './components/frame.js';

import { renderHero } from './components/hero.js';
import { renderProblem } from './components/problem.js';
import { renderSolution } from './components/solution.js';
import { renderFeatures } from './components/features.js';
import { renderDetails } from './components/details.js';
import { renderHowto } from './components/howto.js';
import { renderQuote } from './components/quote.js';
import { renderCta } from './components/cta.js';

import { mountPanel } from './editor/panel.js';
import { attachViewportDropzone, attachOnlineRetry } from './editor/dropzone.js';
import { getCachedUrl, hydrateCache, sweep } from './editor/imageCache.js';

const RENDERERS = {
  hero: renderHero,
  problem: renderProblem,
  solution: renderSolution,
  features: renderFeatures,
  details: renderDetails,
  howto: renderHowto,
  quote: renderQuote,
  cta: renderCta,
};

const CENTERED_TYPES = new Set(['hero', 'cta', 'quote', 'solution']);

function resolveImage(image) {
  if (!image) return '';
  const cached = getCachedUrl(image.localId);
  if (cached) return cached;
  if (image.remoteUrl) return image.remoteUrl;
  return '';
}

function renderSlide(slide, index, total, ctx) {
  const renderer = RENDERERS[slide.type] ?? renderFeatures;
  const body = renderer(slide, ctx);
  const isLast = index === total - 1;
  const centered = CENTERED_TYPES.has(slide.type);
  const classes = [
    'slide',
    `slide--${slide.theme ?? 'light'}`,
    centered ? 'slide--center' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const overrides = slideStyle(slide);
  return `
    <article class="${classes}" data-slide-index="${index}" ${overrides}>
      ${body}
      ${isLast ? '' : swipeArrow(slide.theme ?? 'light')}
      ${progressBar(index, total, slide.theme ?? 'light')}
    </article>
  `;
}

let carousel = null;

function rerenderCarousel({ header, actions, caption, track, dots, viewport }) {
  const state = getState();
  const theme = getActiveTheme();
  applyTheme(theme);

  const ctx = { brand: theme.brand, theme, resolveImage };
  if (header) header.innerHTML = renderHeader(theme.brand, ctx);
  if (actions) actions.innerHTML = renderActions();
  if (caption) caption.innerHTML = renderCaption(theme.brand, theme.caption);
  track.innerHTML = state.slides
    .map((slide, i) => renderSlide(slide, i, state.slides.length, ctx))
    .join('');

  const currentIndex = Math.max(
    0,
    Math.min(getSelectedIndex(), state.slides.length - 1)
  );
  dots.innerHTML = renderDots(state.slides.length, currentIndex);

  carousel?.destroy?.();
  carousel = initCarousel({
    viewport,
    track,
    dots,
    initialIndex: currentIndex,
    onChange: (i) => setSelectedIndex(i),
  });

  // Revoke cache entries that no slide / brand avatar references anymore.
  sweep(collectAllReferencedImageLocalIds(state));
}

async function mount() {
  const editorSlot = document.getElementById('editor-slot');
  const header = document.getElementById('ig-header-slot');
  const actions = document.getElementById('ig-actions-slot');
  const caption = document.getElementById('ig-caption-slot');
  const track = document.getElementById('track');
  const viewport = document.getElementById('viewport');
  const dots = document.getElementById('dots');
  const refs = { header, actions, caption, track, dots, viewport };

  await initStore();
  await hydrateCache();

  mountPanel(editorSlot);
  attachViewportDropzone(viewport, () => getSelectedIndex());
  attachOnlineRetry();

  rerenderCarousel(refs);

  subscribeState(() => rerenderCarousel(refs));
  subscribeSelection((i) => {
    if (carousel && carousel.current() !== i) {
      carousel.goTo(i, true, { notify: false });
    }
    const buttons = dots.querySelectorAll('.dots__dot');
    buttons.forEach((btn, idx) => {
      btn.classList.toggle('dots__dot--active', idx === i);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mount().catch((err) => console.error('[carousel] mount failed', err));
  });
} else {
  mount().catch((err) => console.error('[carousel] mount failed', err));
}
