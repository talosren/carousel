import { escapeHtml, inlineColor, renderBlocks, slideImage } from './chrome.js';

// How-to — numbered workflow slide. Each step may carry an ordered list of
// images rendered directly beneath its title/description. Step numbers are
// editable; when blank we fall back to the 1-based step index.
export function renderHowto(slide, ctx) {
  const steps = slide.steps ?? [];
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:30px;line-height:1.06;margin-bottom:10px;">
      ${escapeHtml(slide.heading ?? '')}
    </h2>
  `;
  const stepRows = steps
    .map((s, i) => {
      const number = escapeHtml(
        s.number && String(s.number).trim()
          ? s.number
          : String(i + 1).padStart(2, '0')
      );
      const imgs = Array.isArray(s.images)
        ? s.images
            .map((img) => {
              const url =
                (typeof ctx?.resolveImage === 'function' && ctx.resolveImage(img)) ||
                img?.remoteUrl ||
                '';
              if (!url) return '';
              const alt = escapeHtml(img?.alt ?? '');
              return `
                <figure class="step-row__media">
                  <img src="${url}" alt="${alt}" />
                  ${img?.alt ? `<figcaption>${alt}</figcaption>` : ''}
                </figure>
              `;
            })
            .join('')
        : '';
      return `
        <div class="step-row">
          <span class="step-row__num" ${inlineColor(s.numberColor)}>${number}</span>
          <div class="step-row__body">
            <div class="step-row__title" ${inlineColor(s.titleColor)}>${escapeHtml(
              s.title ?? ''
            )}</div>
            <div class="step-row__desc" ${inlineColor(s.descColor)}>${escapeHtml(
              s.description ?? ''
            )}</div>
            ${imgs}
          </div>
        </div>
      `;
    })
    .join('');
  return `
    ${bg}
    <div style="position:relative;z-index:2;">
      ${contentMode ? '' : inline}
      ${tag}
      ${heading}
      ${contentMode ? renderBlocks(slide, ctx) : ''}
      <div>${stepRows}</div>
    </div>
  `;
}
