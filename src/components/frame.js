import {
  escapeHtml,
  shouldShowLogoLockup,
  resolveBrandAvatarUrl,
} from './chrome.js';

// Instagram frame chrome — header, actions row, caption.
// The dots are rendered *outside* the frame (see index.html #dots) so they
// can use the full preview width and stay focused during drag interactions.

function headerInitials(brand) {
  const from = String(brand.initials ?? '').trim();
  if (from) return from.slice(0, 2).toUpperCase();
  const name = String(brand.name ?? '').trim();
  if (name) return name[0].toUpperCase();
  const h = String(brand.handle ?? '')
    .replace(/^@/, '')
    .trim();
  if (h) return h[0].toUpperCase();
  return '';
}

export function renderHeader(brand, ctx) {
  const show = shouldShowLogoLockup(brand);
  const avatarSrc = show ? resolveBrandAvatarUrl(brand, ctx) : '';
  const avatarInner = avatarSrc
    ? `<img class="ig-header__avatar-img" src="${escapeHtml(avatarSrc)}" alt="" />`
    : escapeHtml(headerInitials(brand));
  const avatarHtml = show
    ? `<span class="ig-header__avatar">${avatarInner}</span>`
    : '';
  return `
    <div class="ig-header">
      ${avatarHtml}
      <div style="display:flex;flex-direction:column;">
        <span class="ig-header__handle">${escapeHtml(brand.handle ?? brand.name ?? '')}</span>
        ${
          brand.subtitle
            ? `<span class="ig-header__sub">${escapeHtml(brand.subtitle)}</span>`
            : ''
        }
      </div>
      <span style="margin-left:auto;color:var(--ink-faint);font-size:18px;line-height:1;">…</span>
    </div>
  `;
}

export function renderActions() {
  return `
    <div class="ig-actions">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
  `;
}

export function renderCaption(brand, caption) {
  if (!caption) return '';
  const handle = brand.handle ?? brand.name ?? '';
  return `
    <div class="ig-caption">
      <span class="ig-caption__handle">${escapeHtml(handle)}</span>
      <span>${escapeHtml(caption.text ?? '')}</span>
      ${caption.meta ? `<span class="ig-caption__meta">${escapeHtml(caption.meta)}</span>` : ''}
    </div>
  `;
}

export function renderDots(total, activeIndex) {
  return Array.from({ length: total })
    .map(
      (_, i) =>
        `<button type="button" class="dots__dot${
          i === activeIndex ? ' dots__dot--active' : ''
        }" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
    )
    .join('');
}
