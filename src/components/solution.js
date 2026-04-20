import { escapeHtml, renderBlocks, slideImage } from './chrome.js';

// Solution — brand gradient slide with optional prompt / quote box.
export function renderSolution(slide, ctx) {
  const q = slide.quote;
  const { bg, inline, contentMode } = slideImage(slide, ctx);
  const tag = slide.tag
    ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>`
    : '';
  const heading = `
    <h2 class="display" style="font-size:36px;line-height:1.04;">
      ${escapeHtml(slide.heading ?? '')}
    </h2>
  `;
  const body = contentMode
    ? renderBlocks(slide, ctx)
    : slide.body
      ? `<p class="slide-body">${escapeHtml(slide.body)}</p>`
      : '';
  const hasQuoteText = !!(q && (q.text ?? '').trim());
  const hasQuoteLabel = !!(q && (q.label ?? '').trim());
  const quote = hasQuoteText || hasQuoteLabel
    ? `<div class="prompt-box" style="margin-top:18px;">
        ${hasQuoteLabel ? `<p class="prompt-box__label">${escapeHtml(q.label)}</p>` : ''}
        ${hasQuoteText ? `<p class="prompt-box__text">"${escapeHtml(q.text)}"</p>` : ''}
      </div>`
    : '';
  return `
    ${bg}
    <div style="position:relative;z-index:2;max-width:92%;">
      ${contentMode ? '' : inline}
      ${tag}
      ${heading}
      ${body}
      ${quote}
    </div>
  `;
}
