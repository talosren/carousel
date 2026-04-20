import { escapeHtml, inlineColor, renderBlocks, slideImage } from './chrome.js';

// Details — depth slide: swatches, tag pills, customization.
export function renderDetails(slide, ctx) {
  const swatches = slide.swatches ?? [];
  const tags = slide.tags ?? [];
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:30px;line-height:1.06;">
      ${escapeHtml(slide.heading ?? '')}
    </h2>
  `;
  const body = contentMode
    ? renderBlocks(slide, ctx)
    : slide.body
      ? `<p class="slide-body">${escapeHtml(slide.body)}</p>`
      : '';
  const swatchRow = swatches.length
    ? `<div style="display:flex;gap:10px;margin-top:22px;">
        ${swatches
          .map(
            (c) =>
              `<div class="swatch" style="background:${escapeHtml(c)};"></div>`
          )
          .join('')}
      </div>`
    : '';
  const tagRow = tags.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:18px;">
        ${tags
          .map((t) => {
            const text = typeof t === 'string' ? t : t.text ?? '';
            const color = typeof t === 'object' ? t.color : null;
            const cls =
              slide.theme === 'light'
                ? 'pill pill--tag-light'
                : 'pill pill--tag-dark';
            return `<span class="${cls}" ${inlineColor(color)}>${escapeHtml(
              text
            )}</span>`;
          })
          .join('')}
      </div>`
    : '';
  return `
    ${bg}
    <div style="position:relative;z-index:2;max-width:92%;">
      ${contentMode ? '' : inline}
      ${tag}
      ${heading}
      ${body}
      ${swatchRow}
      ${tagRow}
    </div>
  `;
}
