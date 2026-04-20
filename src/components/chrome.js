// ---------------------------------------------------------------------------
// Shared primitives used by every slide template:
//   - progressBar(index, total, theme)   baked into each slide
//   - swipeArrow(theme)                  skipped on the last slide
//   - tagPill, logoLockup, watermark     decorative helpers
//   - slideImage(slide, ctx)             resolves <img src> via ctx.resolveImage
//   - slideStyle(slide)                  inline --X-color overrides from slide.colors
//   - inlineColor(color, prop?)          single-color inline style attribute
// Theme argument is always the slide theme key: 'light' | 'dark' | 'brand'.
// ---------------------------------------------------------------------------

import { TOKEN_KEYS } from '../theme.js';

export function progressBar(index, total, slideTheme) {
  const pct = ((index + 1) / total) * 100;
  const isLight = slideTheme === 'light';
  const trackColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.14)';
  const fillColor = isLight ? 'var(--brand-primary)' : '#ffffff';
  const labelColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
  return `
    <div class="progress">
      <div class="progress__track" style="background:${trackColor};">
        <div class="progress__fill" style="width:${pct}%;background:${fillColor};"></div>
      </div>
      <span class="progress__count" style="color:${labelColor};">${index + 1}/${total}</span>
    </div>
  `;
}

export function swipeArrow(slideTheme) {
  const isLight = slideTheme === 'light';
  const bg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const stroke = isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.4)';
  return `
    <div class="swipe-arrow" style="background:linear-gradient(to right, transparent, ${bg});">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

export function tagPill(text) {
  if (!text) return '';
  return `<span class="slide-tag">${escapeHtml(text)}</span>`;
}

/** True when the slide / frame should show the brand row (avatar + name). */
export function shouldShowLogoLockup(brand) {
  if (!brand || typeof brand !== 'object') return false;
  if (String(brand.name ?? '').trim()) return true;
  if (String(brand.handle ?? '').trim()) return true;
  if (String(brand.initials ?? '').trim()) return true;
  if (String(brand.avatarUrl ?? '').trim()) return true;
  if (String(brand.avatarRemoteUrl ?? '').trim()) return true;
  if (brand.avatarLocalId) return true;
  return false;
}

/** Resolves profile image URL (IndexedDB cache or remote / pasted URL). */
export function resolveBrandAvatarUrl(brand, ctx) {
  if (!brand) return '';
  const remote = String(brand.avatarRemoteUrl || brand.avatarUrl || '').trim();
  const img = { localId: brand.avatarLocalId, remoteUrl: remote || undefined };
  if (img.localId || img.remoteUrl) {
    const u = ctx?.resolveImage?.(img);
    if (u) return u;
  }
  return '';
}

function lockupInitials(brand) {
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

/** Single large letter for the slide watermark (same fallback as lockup, not `??` on raw initials). */
function watermarkMonogram(brand) {
  const s = lockupInitials(brand);
  return s ? s[0] : '';
}

function watermarkLetterFromSlide(slide) {
  if (!slide) return '';
  const h = String(slide.heading ?? '').trim();
  if (h) return h[0].toUpperCase();
  const t = String(slide.tag ?? '').trim();
  if (t) return t[0].toUpperCase();
  return '';
}

export function logoLockup(brand, ctx) {
  if (!shouldShowLogoLockup(brand)) return '';
  const avatarSrc = resolveBrandAvatarUrl(brand, ctx);
  const label = String(brand?.name ?? '').trim();
  const letter = lockupInitials(brand);
  const iconInner = avatarSrc
    ? `<img class="logo-lockup__img" src="${escapeHtml(avatarSrc)}" alt="" />`
    : `<span class="logo-lockup__letter">${escapeHtml(letter)}</span>`;
  const suffix = String(brand?.logoNameSuffix ?? '').trim();
  const fs = String(brand?.logoNameFontSize ?? '').trim();
  const nc = String(brand?.logoNameColor ?? '').trim();
  const sc = String(brand?.logoNameSuffixColor ?? '').trim();
  const nameStyles = [];
  if (fs) nameStyles.push(`font-size:${fs}`);
  if (nc) nameStyles.push(`color:${nc}`);
  const nameStyleAttr = nameStyles.length ? ` style="${nameStyles.join(';')}"` : '';
  const suffixStyles = [];
  if (fs) suffixStyles.push(`font-size:${fs}`);
  if (sc) suffixStyles.push(`color:${sc}`);
  else if (nc) suffixStyles.push(`color:${nc}`);
  const suffixStyleAttr = suffixStyles.length ? ` style="${suffixStyles.join(';')}"` : '';
  const nameHtml =
    label || suffix
      ? `<span class="logo-lockup__name-wrap">${label ? `<span class="logo-lockup__name-text"${nameStyleAttr}>${escapeHtml(label)}</span>` : ''}${suffix ? `<span class="logo-lockup__name-accent"${suffixStyleAttr}>${escapeHtml(suffix)}</span>` : ''}</span>`
      : '';
  const iconRadius = String(brand?.logoAvatarRadius ?? '').trim();
  const iconMod =
    iconRadius && iconRadius !== '999px'
      ? ` style="border-radius:${escapeHtml(iconRadius)}"`
      : '';
  return `
    <div class="logo-lockup">
      <span class="logo-lockup__icon"${iconMod}>${iconInner}</span>
      ${nameHtml}
    </div>
  `;
}

export function watermark(brand, slide) {
  let letter = watermarkMonogram(brand);
  if (!letter) letter = watermarkLetterFromSlide(slide);
  if (!letter) return '';
  return `<div class="watermark" aria-hidden="true">${escapeHtml(letter)}</div>`;
}

// Resolves the URL to render for this slide's image. Prefers the in-memory
// object URL (cache hit for IndexedDB blob) and falls back to the remote
// tmpfiles link. Returns '' if neither is available.
function resolveImageUrl(image, ctx) {
  if (!image) return '';
  if (typeof ctx?.resolveImage === 'function') {
    const v = ctx.resolveImage(image);
    if (v) return v;
  }
  if (image.remoteUrl) return image.remoteUrl;
  // Legacy in-memory src (not persisted) — only kept as a fallback so old
  // callers keep working until the image cache is wired up.
  if (image.src) return image.src;
  return '';
}

// Returns { bg, inline, replaces, contentMode } so each slide template can
// decide where to place the image. When contentMode is true the slide should
// delegate body rendering to renderBlocks() instead of emitting inline/body
// markup itself.
export function slideImage(slide, ctx) {
  const img = slide?.image;
  const url = resolveImageUrl(img, ctx);
  const placement = img?.placement ?? 'inline';
  if (!img || !url) {
    // Still signal content mode so the slide renderer knows to use blocks when
    // there's a broken/missing image url but the user has configured blocks.
    return { bg: '', inline: '', replaces: false, contentMode: placement === 'content' };
  }
  const alt = escapeHtml(img.alt ?? '');

  if (placement === 'background') {
    return {
      bg: `
        <div class="slide-bg" aria-hidden="true">
          <img src="${url}" alt="${alt}" />
          <div class="slide-bg__scrim"></div>
        </div>
      `,
      inline: '',
      replaces: false,
      contentMode: false,
    };
  }

  if (placement === 'content') {
    // Image placement is driven by renderBlocks(); return empty inline markup.
    return { bg: '', inline: '', replaces: false, contentMode: true };
  }

  return {
    bg: '',
    inline: `
      <figure class="slide-media">
        <img src="${url}" alt="${alt}" />
      </figure>
    `,
    replaces: false,
    contentMode: false,
  };
}

// Walks slide.blocks and emits the markup in order. Text blocks render as
// <p class="slide-body"> and the image block renders as <figure> with its
// caption pulled from slide.image.alt. Used by slides in 'content' mode.
export function renderBlocks(slide, ctx) {
  const blocks = Array.isArray(slide?.blocks) ? slide.blocks : [];
  const img = slide?.image;
  const url = resolveImageUrl(img, ctx);
  return blocks
    .map((b) => {
      if (b.type === 'text') {
        const text = b.text ?? '';
        if (!text) return '';
        return `<p class="slide-body">${escapeHtml(text)}</p>`;
      }
      if (b.type === 'image') {
        if (!url) return '';
        const alt = escapeHtml(img?.alt ?? '');
        return `
          <figure class="slide-media slide-media--content">
            <img src="${url}" alt="${alt}" />
            ${img?.alt ? `<figcaption>${alt}</figcaption>` : ''}
          </figure>
        `;
      }
      return '';
    })
    .join('');
}

// Back-compat for hero / cta checking whether an image is present.
export function hasImage(slide, ctx) {
  return Boolean(resolveImageUrl(slide?.image, ctx));
}

// Map from token key -> kebab-case --var name used in CSS.
const VAR_NAMES = Object.fromEntries(
  TOKEN_KEYS.map((k) => [k, `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`])
);

// Build an inline style="" that sets --<token> overrides from slide.colors.
// `--tag-color: red;` etc. Items that are not in TOKEN_KEYS are ignored so a
// stale slide can't inject arbitrary CSS.
export function slideStyle(slide) {
  const overrides = slide?.colors;
  if (!overrides || typeof overrides !== 'object') return '';
  const parts = [];
  for (const [key, value] of Object.entries(overrides)) {
    if (!value) continue;
    const name = VAR_NAMES[key];
    if (!name) continue;
    parts.push(`${name}: ${value}`);
  }
  if (!parts.length) return '';
  return `style="${parts.join('; ')}"`;
}

// Tiny helper for per-item color overrides. Pass any CSS property name; the
// default is `color` since most of our list items color text.
export function inlineColor(value, prop = 'color') {
  if (!value) return '';
  return `style="${prop}: ${value};"`;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
