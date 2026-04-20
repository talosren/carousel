import { escapeHtml, inlineColor, slideImage } from './chrome.js';

// Features — heading at top, icon+label+description rows beneath it.
export function renderFeatures(slide, ctx) {
  const items = slide.items ?? [];
  const { bg, inline, replaces } = slideImage(slide, ctx);
  return `
    ${bg}
    <div style="position:relative;z-index:2;">
      ${inline}
      ${
        replaces
          ? ''
          : `
            ${slide.tag ? `<span class="slide-tag">${escapeHtml(slide.tag)}</span>` : ''}
            <h2 class="display" style="font-size:30px;line-height:1.06;margin-bottom:14px;">
              ${escapeHtml(slide.heading ?? '')}
            </h2>
            <div>
              ${items
                .map(
                  (it) => `
                    <div class="feature-row">
                      <span class="feature-row__icon" ${inlineColor(it.iconColor)}>${escapeHtml(
                        it.icon ?? '◦'
                      )}</span>
                      <div>
                        <span class="feature-row__label" ${inlineColor(it.labelColor)}>${escapeHtml(
                          it.label ?? ''
                        )}</span>
                        <span class="feature-row__desc" ${inlineColor(it.descColor)}>${escapeHtml(
                          it.description ?? ''
                        )}</span>
                      </div>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
      }
    </div>
  `;
}
