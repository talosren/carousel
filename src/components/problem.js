import { escapeHtml, inlineColor, renderBlocks, slideImage } from './chrome.js';

// Problem — strikethrough pills of "what's being replaced" above the heading.
export function renderProblem(slide, ctx) {
  const pills = slide.pills ?? [];
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const pillRow = pills.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px;">
        ${pills
          .map((p) => {
            const text = typeof p === 'string' ? p : p.text ?? '';
            const color = typeof p === 'object' ? p.color : null;
            return `<span class="pill pill--strike" ${inlineColor(
              color
            )}>${escapeHtml(text)}</span>`;
          })
          .join('')}
      </div>`
    : '';
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:34px;line-height:1.05;">
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
    <div style="position:relative;z-index:2;max-width:92%;">
      ${contentMode ? '' : inline}
      ${pillRow}
      ${tag}
      ${heading}
      ${body}
    </div>
  `;
}
