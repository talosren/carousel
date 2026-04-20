import {
  escapeHtml,
  hasImage,
  logoLockup,
  renderBlocks,
  slideImage,
  watermark,
} from './chrome.js';

// CTA — brand gradient final slide. No swipe arrow (handled in app.js),
// progress bar at 100% (handled by progressBar helper).
export function renderCta(slide, ctx) {
  const { brand } = ctx;
  const cta = slide.cta ?? {};
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const showWatermark = slide.watermark !== false && !hasImage(slide, ctx);
  const ctaStyle = [];
  if (cta.bgColor) ctaStyle.push(`background: ${cta.bgColor}`);
  if (cta.textColor) ctaStyle.push(`color: ${cta.textColor}`);
  const ctaStyleAttr = ctaStyle.length ? `style="${ctaStyle.join('; ')}"` : '';
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:40px;line-height:1.02;margin-bottom:10px;">
      ${escapeHtml(slide.heading ?? '')}
    </h2>
  `;
  const body = contentMode
    ? renderBlocks(slide, ctx)
    : slide.body
      ? `<p class="slide-body" style="margin-bottom:22px;">${escapeHtml(slide.body)}</p>`
      : '';
  const button = cta.text
    ? `<a class="cta-button" href="${escapeHtml(cta.href ?? '#')}" target="_blank" rel="noopener" ${ctaStyleAttr}>
        ${escapeHtml(cta.text)}
      </a>`
    : '';
  return `
    ${bg}
    ${showWatermark ? watermark(brand, slide) : ''}
    <div style="position:absolute;top:32px;left:36px;right:36px;z-index:3;">
      ${logoLockup(brand, ctx)}
    </div>
    <div style="position:relative;z-index:2;text-align:left;">
      ${contentMode ? '' : inline}
      ${tag}
      ${heading}
      ${body}
      ${button}
    </div>
  `;
}
