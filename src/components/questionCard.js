import { escapeHtml } from './chrome.js';
import { socialIconMarkup } from './socialIcons.js';

function resolveRef(ref, ctx) {
  if (!ref) return '';
  const image = {
    localId: ref.localId,
    remoteUrl: ref.remoteUrl || undefined,
  };
  if (!image.localId && !image.remoteUrl) return '';
  const resolved = ctx?.resolveImage?.(image);
  return resolved || image.remoteUrl || '';
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function socialColor(slide, theme) {
  const mode = slide?.theme || 'light';
  return (
    slide?.colors?.cardSocial ||
    theme?.tokens?.[mode]?.cardSocial ||
    '#111111'
  );
}

function socialRow(social, ctx, color) {
  const text = String(social.text ?? '').trim();
  const customUrl =
    social.icon === 'custom' ? resolveRef({ localId: social.iconLocalId, remoteUrl: social.iconRemoteUrl }, ctx) : '';
  const icon = customUrl
    ? `<img class="qcard__icon" src="${escapeHtml(customUrl)}" alt="" />`
    : socialIconMarkup(social.icon, color);
  if (!text && !customUrl && social.icon === 'custom') return '';
  return `<span class="qcard__social-icon">${icon}</span><span class="qcard__social-text">${escapeHtml(text)}</span>`;
}

export function renderQuestionCard(slide, ctx) {
  const card = ctx?.theme?.linkedin ?? {};
  const label =
    String(slide?.questionLabel ?? '').trim() || String(card.label ?? '');
  const question = String(
    slide?.question ?? slide?.heading ?? slide?.text ?? slide?.body ?? ''
  );
  const signature = String(card.signature ?? '');
  const size = Math.min(32, Math.max(10, Number(card.questionSize) || 15));

  const photo = resolveRef(card.background, ctx);
  const mark = resolveRef(card.watermark, ctx);
  const opacity = Math.min(1, Math.max(0, Number(card.watermark?.opacity ?? 0.06)));
  const markSize = Math.min(100, Math.max(20, Number(card.watermark?.size ?? 70)));
  const markX = finite(card.watermark?.x, 50);
  const markY = finite(card.watermark?.y, 50);
  const box = `left:${markX}%;top:${markY}%;width:${markSize}%;height:${markSize}%`;

  const photoLayer = photo
    ? `<img class="qcard__photo" src="${escapeHtml(photo)}" alt="" />`
    : '';
  const markLayer = mark
    ? `<img class="qcard__mark" src="${escapeHtml(mark)}" alt="" style="${box};opacity:${opacity}" />
       <div class="qcard__mark-handle" data-watermark-handle data-x="${markX}" data-y="${markY}" style="${box}"></div>`
    : '';

  const color = socialColor(slide, ctx?.theme);
  const socials = (Array.isArray(card.socials) ? card.socials : [])
    .map((social) => socialRow(social, ctx, color))
    .filter(Boolean)
    .join('');

  return `
    ${photoLayer}
    ${markLayer}
    <div class="qcard">
      ${label ? `<div class="qcard__label">${escapeHtml(label)}</div>` : ''}
      <div class="qcard__rule"></div>
      <p class="qcard__question" style="font-size:${size}px">${escapeHtml(question)}</p>
      ${signature ? `<div class="qcard__signature">${escapeHtml(signature)}</div>` : '<div class="qcard__signature"></div>'}
      <div class="qcard__rule"></div>
      <div class="qcard__socials">
        ${socials ? `<div class="qcard__social-grid">${socials}</div>` : ''}
      </div>
    </div>
  `;
}
