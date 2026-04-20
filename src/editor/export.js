// ---------------------------------------------------------------------------
// Client-side slide export via html2canvas + JSZip (both loaded in
// index.html as ESM CDN imports and placed on window.__carouselDeps).
//
// exportSlidePng(i) downloads a single 1080x1350 PNG.
// exportAllZip()    bundles every slide into carousel-slides.zip.
// ---------------------------------------------------------------------------

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1350;
const SOURCE_WIDTH = 420;
const SCALE = TARGET_WIDTH / SOURCE_WIDTH; // 2.571428...

function deps() {
  const d = window.__carouselDeps;
  if (!d?.html2canvas || !d?.JSZip) {
    throw new Error(
      'Export libraries not loaded yet. Reload the page and try again.'
    );
  }
  return d;
}

function slidesInDom() {
  return Array.from(document.querySelectorAll('.carousel-track > .slide'));
}

// Pulls a solid fallback color from the slide's computed style so the
// exported PNG always has an opaque backdrop. html2canvas's `backgroundColor`
// only accepts a solid color, so for gradient themes we parse the first
// color out of `--slide-bg` and rely on html2canvas to paint the gradient
// on top.
function resolveExportBg(slideEl) {
  const cs = getComputedStyle(slideEl);
  const bc = cs.backgroundColor;
  if (bc && bc !== 'transparent' && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(bc)) {
    return bc;
  }
  const raw = cs.getPropertyValue('--slide-bg').trim();
  const m = raw.match(/#(?:[0-9a-f]{3}){1,2}|rgba?\([^)]+\)|hsla?\([^)]+\)/i);
  return m ? m[0] : '#ffffff';
}

async function rasterizeSlide(slideEl) {
  const { html2canvas } = deps();
  slideEl.classList.add('is-exporting');
  try {
    const canvas = await html2canvas(slideEl, {
      width: SOURCE_WIDTH,
      height: TARGET_HEIGHT / SCALE,
      scale: SCALE,
      useCORS: true,
      backgroundColor: resolveExportBg(slideEl),
      logging: false,
    });
    return canvas;
  } finally {
    slideEl.classList.remove('is-exporting');
  }
}

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSlidePng(index) {
  const slides = slidesInDom();
  const slide = slides[index];
  if (!slide) throw new Error(`No slide at index ${index}`);
  const canvas = await rasterizeSlide(slide);
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error('Failed to create PNG blob');
  downloadBlob(blob, `slide_${String(index + 1).padStart(2, '0')}.png`);
  return blob;
}

export async function exportAllZip() {
  const { JSZip } = deps();
  const slides = slidesInDom();
  if (!slides.length) throw new Error('No slides to export');

  const zip = new JSZip();
  for (let i = 0; i < slides.length; i += 1) {
    const canvas = await rasterizeSlide(slides[i]);
    const blob = await canvasToBlob(canvas);
    if (!blob) continue;
    const name = `slide_${String(i + 1).padStart(2, '0')}.png`;
    zip.file(name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'carousel-slides.zip');
  return zipBlob;
}
