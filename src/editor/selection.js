// Tiny selection store — the index of the slide currently highlighted in the
// editor panel. The carousel observes this to scroll to the slide, and the
// carousel observers push back on drag/keyboard navigation.

let index = 0;
const listeners = new Set();

export function getIndex() {
  return index;
}

export function setIndex(next, { silent = false } = {}) {
  const n = Math.max(0, Math.floor(next) || 0);
  if (n === index) return;
  index = n;
  if (!silent) for (const fn of listeners) fn(index);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
