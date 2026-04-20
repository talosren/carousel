import {
  escapeHtml,
  hasImage,
  logoLockup,
  renderBlocks,
  slideImage,
  watermark,
} from './chrome.js';

// Hero — stops the scroll. Logo lockup top, bold statement centered.
export function renderHero(slide, ctx) {
  const { brand } = ctx;
  const imgPresent = hasImage(slide, ctx);
  const showWatermark = slide.watermark !== false && !imgPresent;
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:40px;line-height:1.02;">
      ${escapeHtml(slide.heading ?? '')}
    </h2>
  `;
  const body = contentMode
    ? renderBlocks(slide, ctx)
    : slide.body
      ? `<p class="slide-body">${escapeHtml(slide.body)}</p>`
      : '';
  return `
    ${bg}
    ${showWatermark ? watermark(brand, slide) : ''}
    <div style="position:absolute;top:32px;left:36px;right:36px;z-index:3;">
      ${logoLockup(brand, ctx)}
    </div>
    <div style="position:relative;z-index:2;max-width:88%;">
      ${contentMode ? '' : inline}
      ${tag}
      ${heading}
      ${body}
    </div>
  `;
}
