import { escapeHtml, renderBlocks, slideImage } from './chrome.js';

// Quote — oversized serif pull-quote with attribution.
export function renderQuote(slide, ctx) {
  const attr = slide.attribution ?? {};
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const pull = `
    <p class="display" style="font-size:28px;line-height:1.18;font-style:italic;">
      "${escapeHtml(slide.text ?? slide.heading ?? '')}"
    </p>
  `;
  const attribution = (attr.name || attr.role)
    ? `<div style="margin-top:16px;display:flex;align-items:center;gap:10px;">
        ${
          attr.name
            ? `<span class="sans" style="font-size:13px;font-weight:600;">${escapeHtml(
                attr.name
              )}</span>`
            : ''
        }
        ${
          attr.role
            ? `<span class="sans" style="font-size:12px;opacity:0.7;">${escapeHtml(
                attr.role
              )}</span>`
            : ''
        }
      </div>`
    : '';
  return `
    ${bg}
    <div style="position:relative;z-index:2;max-width:94%;">
      ${contentMode ? '' : inline}
      ${tag}
      ${pull}
      ${contentMode ? renderBlocks(slide, ctx) : ''}
      ${attribution}
    </div>
  `;
}
