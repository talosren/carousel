// ---------------------------------------------------------------------------
// Carousel interaction layer.
// Given a .carousel-viewport + .carousel-track + .dots container, wires up:
//   - pointer drag with edge rubber-banding
//   - keyboard ← / → / Home / End
//   - dot click navigation
//   - a single goTo(index) that sets track transform + active dot
// The viewport is measured at runtime so the architecture-mandated 420px
// frame isn't hard-coded into the JS.
// ---------------------------------------------------------------------------

const SNAP_THRESHOLD_PX = 48;
const RUBBER_BAND = 0.3;
const TRANSITION = 'transform 380ms cubic-bezier(0.22, 0.61, 0.36, 1)';

export function initCarousel({ viewport, track, dots, onChange, initialIndex = 0 }) {
  const slides = Array.from(track.children);
  const total = slides.length;
  if (!total) {
    return { goTo: () => {}, current: () => 0, total: 0, destroy: () => {} };
  }

  let current = Math.max(0, Math.min(total - 1, Math.floor(initialIndex) || 0));
  let slideWidth = viewport.getBoundingClientRect().width;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let lockedAxis = null; // 'x' | 'y' | null
  let pointerId = null;

  function setTransform(tx, animate) {
    track.style.transition = animate ? TRANSITION : 'none';
    track.style.transform = `translate3d(${tx}px, 0, 0)`;
  }

  function restingOffset(index = current) {
    return -index * slideWidth;
  }

  function goTo(index, animate = true, { notify = true } = {}) {
    const next = Math.max(0, Math.min(total - 1, index));
    const changed = next !== current;
    current = next;
    setTransform(restingOffset(current), animate);
    syncDots();
    if (changed && notify) onChange?.(current);
  }

  function syncDots() {
    if (!dots) return;
    const buttons = dots.querySelectorAll('.dots__dot');
    buttons.forEach((el, i) => {
      el.classList.toggle('dots__dot--active', i === current);
    });
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
    lockedAxis = null;
    slideWidth = viewport.getBoundingClientRect().width;
    viewport.setPointerCapture?.(pointerId);
    track.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!lockedAxis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lockedAxis === 'y') {
        dragging = false;
        return;
      }
    }

    e.preventDefault();
    deltaX = dx;

    // Rubber-band at first / last slide edges.
    let effective = deltaX;
    if (current === 0 && deltaX > 0) effective = deltaX * RUBBER_BAND;
    if (current === total - 1 && deltaX < 0) effective = deltaX * RUBBER_BAND;

    setTransform(restingOffset(current) + effective, false);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (pointerId != null) {
      viewport.releasePointerCapture?.(pointerId);
      pointerId = null;
    }
    if (lockedAxis !== 'x') {
      setTransform(restingOffset(current), true);
      return;
    }
    const previous = current;
    if (deltaX < -SNAP_THRESHOLD_PX && current < total - 1) {
      current += 1;
    } else if (deltaX > SNAP_THRESHOLD_PX && current > 0) {
      current -= 1;
    }
    setTransform(restingOffset(current), true);
    syncDots();
    if (current !== previous) onChange?.(current);
  }

  function onKey(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(total - 1);
    }
  }

  function onDotClick(e) {
    const btn = e.target.closest('.dots__dot');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (Number.isFinite(idx)) goTo(idx);
  }

  function onResize() {
    slideWidth = viewport.getBoundingClientRect().width;
    setTransform(restingOffset(current), false);
  }

  function onDragStart(e) {
    e.preventDefault();
  }

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
  viewport.addEventListener('lostpointercapture', onPointerUp);
  viewport.addEventListener('dragstart', onDragStart);

  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  if (dots) dots.addEventListener('click', onDotClick);

  // Initial placement without animation.
  requestAnimationFrame(() => {
    slideWidth = viewport.getBoundingClientRect().width;
    setTransform(restingOffset(current), false);
    syncDots();
  });

  function destroy() {
    viewport.removeEventListener('pointerdown', onPointerDown);
    viewport.removeEventListener('pointermove', onPointerMove);
    viewport.removeEventListener('pointerup', onPointerUp);
    viewport.removeEventListener('pointercancel', onPointerUp);
    viewport.removeEventListener('lostpointercapture', onPointerUp);
    viewport.removeEventListener('dragstart', onDragStart);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    if (dots) dots.removeEventListener('click', onDotClick);
  }

  return {
    goTo,
    current: () => current,
    total,
    destroy,
  };
}
