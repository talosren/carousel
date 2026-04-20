// ---------------------------------------------------------------------------
// Editor panel — rendered into the left-side <aside id="editor-slot">.
// Subscribes to the reactive store + selection module and routes every input
// via event delegation to a store mutator.
//
// Section order:
//   1. Theme library (pick/create/duplicate/rename/delete/import/export)
//   2. Active theme (brand, caption, palette, fonts, tabbed token editor)
//   3. Slide list
//   4. Selected slide (type, theme, text, override colors, type-specific)
//   5. Image block (status badges, share link, retry)
//   6. Footer (PNG, ZIP, JSON import/export, reset)
// ---------------------------------------------------------------------------

import {
  getState,
  getActiveTheme,
  subscribe as subscribeState,
  addSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  updateSlide,
  addBlock,
  updateBlock,
  moveBlock,
  removeBlock,
  addStepImage,
  updateStepImage,
  moveStepImage,
  removeStepImage,
  updateBrand,
  updateCaption,
  updateColors,
  updateActiveTheme,
  updateActiveTokens,
  setActiveTheme,
  createTheme,
  duplicateTheme,
  renameTheme,
  deleteTheme,
  exportTheme,
  importTheme,
  resetDefaults,
  toJSON,
  loadJSON,
} from '../store.js';

import {
  TOKEN_GROUPS,
  TOKEN_LABELS,
  TOKEN_MODES,
  blankTokens,
} from '../theme.js';

import {
  getIndex as getSelectedIndex,
  setIndex as setSelectedIndex,
  subscribe as subscribeSelection,
} from './selection.js';

import { applyImageToSlide } from './dropzone.js';
import { isImageFile, uploadToTmpfiles, ingestImage } from './upload.js';
import { getImage, deleteImage } from './imageStore.js';
import { getCachedUrl } from './imageCache.js';
import { exportSlidePng, exportAllZip } from './export.js';

const SLIDE_TYPES = [
  'hero',
  'problem',
  'solution',
  'features',
  'details',
  'howto',
  'quote',
  'cta',
];

// Transient UI state (never persisted).
const uploadStatus = new Map(); // slideIndex -> { state, message, url }
const stepUploadStatus = new Map(); // `${slideIndex}:${stepId}` -> status (for the pending add)
const disclosureState = new Map(); // disclosureId -> boolean (open/closed)
const customFontMode = { display: false, body: false };
const customIconMode = new Map(); // `${slideIndex}:${rowIndex}` -> true

function iconKey(slideIndex, rowIndex) {
  return `${slideIndex}:${rowIndex}`;
}
let activeTokenTab = 'light';
let root = null;

// Hand-picked font presets for the Display/Body font dropdowns. Pairs with
// `Custom…` which reveals a free-text input for any CSS font-family.
const FONT_PRESETS = [
  'Inter',
  'Instrument Serif',
  'Helvetica',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Menlo',
  'Courier New',
  'system-ui',
];

// Bullet glyphs used by the feature-row icon dropdown.
const BULLET_PRESETS = ['●', '○', '◇', '◈', '✓', '✗', '★', '→', '—', '▲', '◦'];

// Read an open/closed state for a disclosure, defaulting to `fallback` the
// first time we've seen this id. Keeps <details> panels sticky across renders,
// theme switches, and slide selection changes.
function discOpen(id, fallback) {
  if (disclosureState.has(id)) return disclosureState.get(id);
  return fallback;
}

export function mountPanel(mountPoint) {
  root = mountPoint;
  root.classList.add('editor');
  root.innerHTML = shell();
  attachGlobalHandlers();
  render();
  subscribeState(render);
  subscribeSelection(render);
}

function shell() {
  return `
    <div class="editor__head">
      <h1>Carousel Builder</h1>
      <p>Edit below. Autosaved to this browser.</p>
    </div>
    <div class="editor__body" id="editor-body"></div>
    <div class="editor__foot" id="editor-foot"></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

function render() {
  if (!root) return;
  const body = root.querySelector('#editor-body');
  const foot = root.querySelector('#editor-foot');
  if (!body || !foot) return;

  const state = getState();
  const theme = getActiveTheme();
  const selectedIndex = Math.max(
    0,
    Math.min(getSelectedIndex(), state.slides.length - 1)
  );

  const focusInfo = captureFocus(body);
  body.innerHTML =
    themeLibrarySection(state, theme) +
    activeThemeSection(theme) +
    slideListSection(state, selectedIndex) +
    selectedSlideSection(state, selectedIndex);
  restoreFocus(body, focusInfo);

  foot.innerHTML = footerActions();
}

// ========================= 1. Theme library ===============================

function themeLibrarySection(state, active) {
  const options = state.themes
    .map(
      (t) =>
        `<option value="${attr(t.id)}"${
          t.id === active.id ? ' selected' : ''
        }>${escape(t.name)}</option>`
    )
    .join('');
  return `
    <section class="edit-section">
      <div class="edit-section__title">Theme library</div>
      <div class="theme-lib">
        <div class="theme-lib__row">
          <select class="field__select" data-field="activeThemeId">
            ${options}
          </select>
        </div>
        <div class="theme-lib__actions">
          <button class="btn btn--secondary btn--small" data-action="new-theme">New</button>
          <button class="btn btn--secondary btn--small" data-action="duplicate-theme">Duplicate</button>
          <button class="btn btn--danger btn--small" data-action="delete-theme"
            ${state.themes.length <= 1 ? 'disabled' : ''}>Delete</button>
          <button class="btn btn--ghost btn--small" data-action="rename-theme">Rename</button>
          <button class="btn btn--ghost btn--small" data-action="export-theme">Export</button>
          <button class="btn btn--ghost btn--small" data-action="import-theme">Import</button>
        </div>
      </div>
    </section>
  `;
}

// ========================= 2. Active theme ================================

function activeThemeSection(theme) {
  const brand = theme.brand ?? {};
  const caption = theme.caption ?? {};
  const colors = theme.colors ?? {};
  const fonts = theme.fonts ?? {};
  return `
    <section class="edit-section">
      <div class="edit-section__title">Active theme</div>

      <div class="field">
        <label class="field__label">Theme name</label>
        <input class="field__input" type="text"
          data-field="theme.name" value="${attr(theme.name)}" />
      </div>

      <div class="field">
        <label class="field__label">Brand name</label>
        <input class="field__input" type="text"
          data-field="brand.name" value="${attr(brand.name)}" />
      </div>
      <div class="field__row">
        <div class="field">
          <label class="field__label">Logo name suffix</label>
          <input class="field__input" type="text" maxlength="6"
            data-field="brand.logoNameSuffix" placeholder="e.g. ."
            value="${attr(brand.logoNameSuffix)}" />
        </div>
        <div class="field">
          <label class="field__label">Logo name size</label>
          <input class="field__input" type="text"
            data-field="brand.logoNameFontSize" placeholder="13px, 1.25rem"
            value="${attr(brand.logoNameFontSize)}" />
        </div>
      </div>
      <div class="field__row">
        ${colorField('Logo name color', 'brand.logoNameColor', brand.logoNameColor)}
        ${colorField('Suffix color', 'brand.logoNameSuffixColor', brand.logoNameSuffixColor)}
      </div>
      <div class="field">
        <label class="field__label">Logo avatar corner radius</label>
        <input class="field__input" type="text"
          data-field="brand.logoAvatarRadius" placeholder="999px circle, 8px rounded square"
          value="${attr(brand.logoAvatarRadius)}" />
      </div>
      <div class="field__row">
        <div class="field">
          <label class="field__label">Handle</label>
          <input class="field__input" type="text"
            data-field="brand.handle" value="${attr(brand.handle)}" />
        </div>
        <div class="field">
          <label class="field__label">Avatar letter</label>
          <input class="field__input" type="text" maxlength="2"
            data-field="brand.initials" value="${attr(brand.initials)}" />
        </div>
      </div>
      <div class="field">
        <label class="field__label">Profile photo</label>
        <div class="field__row" style="align-items:center;">
          <input class="field__input" type="url" placeholder="https://…"
            data-field="brand.avatarUrl" value="${attr(brand.avatarUrl)}" />
          <button type="button" class="btn btn--secondary btn--small"
            data-action="brand-avatar-pick">Upload</button>
          <button type="button" class="btn btn--ghost btn--small"
            data-action="brand-avatar-remove">Remove</button>
        </div>
        <p style="margin-top:4px;font-size:11px;color:var(--ink-muted);">
          Optional image for the circle avatar (carousel + frame header). Upload is stored locally and shared when online. If brand name, handle, letter, and photo are all empty, the top-left logo row is hidden.
        </p>
      </div>
      <div class="field">
        <label class="field__label">Caption</label>
        <textarea class="field__textarea" rows="2"
          data-field="caption.text">${attr(caption.text)}</textarea>
      </div>

      <details class="disclosure" data-disclosure-id="theme:palette"
        ${discOpen('theme:palette', false) ? 'open' : ''}>
        <summary>Palette &amp; fonts</summary>
        <div class="disclosure__body">
          <div class="field__row field__row--3">
            ${colorField('Primary', 'colors.primary', colors.primary)}
            ${colorField('Gradient from', 'colors.gradientFrom', colors.gradientFrom)}
            ${colorField('Gradient to', 'colors.gradientTo', colors.gradientTo)}
          </div>
          <div class="field__row">
            ${fontPicker('Display font', 'display', fonts.display)}
            ${fontPicker('Body font', 'body', fonts.body)}
          </div>
        </div>
      </details>

      <details class="disclosure" data-disclosure-id="theme:element-colors"
        ${discOpen('theme:element-colors', true) ? 'open' : ''}>
        <summary>Element colors (per mode)</summary>
        <div class="disclosure__body">
          ${tokenTabs()}
          ${tokenEditor(theme, activeTokenTab)}
        </div>
      </details>
    </section>
  `;
}

function tokenTabs() {
  return `
    <div class="token-tabs" role="tablist">
      ${TOKEN_MODES.map(
        (m) => `
          <button class="token-tab ${activeTokenTab === m ? 'is-active' : ''}"
            data-action="token-tab" data-mode="${m}" type="button">${m}</button>
        `
      ).join('')}
    </div>
  `;
}

function tokenEditor(theme, mode) {
  const tokens = theme.tokens?.[mode] ?? {};
  return TOKEN_GROUPS.map(
    (group) => `
      <div class="edit-section__title" style="margin-top:6px;">${group.label}</div>
      <div class="token-grid">
        ${group.keys
          .map((key) =>
            colorField(
              TOKEN_LABELS[key] ?? key,
              `tokens.${mode}.${key}`,
              tokens[key]
            )
          )
          .join('')}
      </div>
    `
  ).join('');
}

function colorField(label, field, value) {
  const hex = toHex(value);
  return `
    <div class="field">
      <label class="field__label">${escape(label)}</label>
      <div class="field__color">
        <input type="color" data-field="${attr(field)}" value="${attr(hex || '#000000')}" />
        <input type="text" data-field="${attr(field)}" value="${attr(value ?? '')}" />
      </div>
    </div>
  `;
}

// Bullet/glyph picker for feature rows. Renders as a compact <select> with
// a 'Custom…' option that swaps to a free-text input on next render.
function bulletPicker(slideIndex, rowIndex, value) {
  const current = value ?? '';
  const matched = BULLET_PRESETS.includes(current);
  const customActive = customIconMode.get(iconKey(slideIndex, rowIndex)) ||
    (!matched && current !== '');
  if (customActive) {
    return `
      <input type="text" class="bullet-picker__input"
        data-field="list.items.${rowIndex}.icon" data-index="${slideIndex}"
        value="${attr(current)}" placeholder="◇" />
    `;
  }
  const options = BULLET_PRESETS.map(
    (g) => `<option value="${attr(g)}" ${current === g ? 'selected' : ''}>${escape(g)}</option>`
  ).join('');
  return `
    <select class="bullet-picker"
      data-icon-picker="1" data-index="${slideIndex}" data-row="${rowIndex}">
      <option value="" ${current === '' ? 'selected' : ''} disabled hidden>•</option>
      ${options}
      <option value="__custom__">Custom…</option>
    </select>
  `;
}

// Dropdown of curated font families plus a 'Custom…' option that reveals a
// text input. `slot` is the fonts.* key ('display' or 'body').
function fontPicker(label, slot, value) {
  const current = value ?? '';
  const matched = FONT_PRESETS.includes(current);
  const custom = customFontMode[slot] || (!matched && current !== '');
  const selectValue = custom ? '__custom__' : (matched ? current : '');
  const options = FONT_PRESETS.map(
    (f) => `<option value="${attr(f)}" ${selectValue === f ? 'selected' : ''}>${escape(f)}</option>`
  ).join('');
  return `
    <div class="field">
      <label class="field__label">${escape(label)}</label>
      <select class="field__select" data-font-picker="${attr(slot)}">
        <option value="" ${selectValue === '' ? 'selected' : ''} disabled hidden>Pick a font…</option>
        ${options}
        <option value="__custom__" ${selectValue === '__custom__' ? 'selected' : ''}>Custom…</option>
      </select>
      ${
        custom
          ? `<input class="field__input" type="text" style="margin-top:6px;"
              placeholder="e.g. 'Helvetica Neue', sans-serif"
              data-field="fonts.${attr(slot)}" value="${attr(current)}" />`
          : ''
      }
    </div>
  `;
}

// ========================= 3. Slide list ==================================

function slideListSection(state, selectedIndex) {
  const rows = state.slides
    .map((s, i) => {
      const active = i === selectedIndex ? ' is-active' : '';
      const title = s.heading || s.text || `Slide ${i + 1}`;
      return `
        <div class="slide-card${active}" data-action="select-slide" data-index="${i}">
          <span class="slide-card__index">${i + 1}</span>
          <div class="slide-card__meta">
            <div class="slide-card__type">${escape(s.type)}</div>
            <div class="slide-card__title">${escape(title)}</div>
          </div>
          <div class="slide-card__actions" data-stop-select>
            <button class="icon-btn" data-action="move-up" data-index="${i}"
              ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
            <button class="icon-btn" data-action="move-down" data-index="${i}"
              ${i === state.slides.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
            <button class="icon-btn" data-action="duplicate" data-index="${i}" title="Duplicate">⎘</button>
            <button class="icon-btn" data-action="delete" data-index="${i}"
              ${state.slides.length <= 1 ? 'disabled' : ''} title="Delete">×</button>
          </div>
        </div>
      `;
    })
    .join('');
  return `
    <section class="edit-section">
      <div class="edit-section__title">Slides (${state.slides.length})</div>
      <div class="slide-list">${rows}</div>
      <div class="add-slide">
        <select class="field__select" id="add-slide-type">
          ${SLIDE_TYPES.map(
            (t) => `<option value="${t}">Add ${t}</option>`
          ).join('')}
        </select>
        <button class="btn btn--secondary btn--small" data-action="add-slide">Add</button>
      </div>
    </section>
  `;
}

// ========================= 4. Selected slide ==============================

function selectedSlideSection(state, selectedIndex) {
  const slide = state.slides[selectedIndex];
  if (!slide) return '';
  return `
    <section class="edit-section">
      <div class="edit-section__title">Slide ${selectedIndex + 1} — ${escape(slide.type)}</div>
      ${typeAndTheme(slide, selectedIndex)}
      ${textFields(slide, selectedIndex)}
      ${overrideColorsBlock(slide, selectedIndex)}
      ${typeSpecificFields(slide, selectedIndex)}
      ${imageBlock(slide, selectedIndex)}
    </section>
  `;
}

function typeAndTheme(slide, i) {
  const themes = ['light', 'dark', 'brand'];
  return `
    <div class="field__row">
      <div class="field">
        <label class="field__label">Type</label>
        <select class="field__select" data-field="slide.type" data-index="${i}">
          ${SLIDE_TYPES.map(
            (t) =>
              `<option value="${t}"${t === slide.type ? ' selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label class="field__label">Theme mode</label>
        <div class="chip-group">
          ${themes
            .map(
              (t) => `
                <label>
                  <input type="radio" name="theme-${i}" value="${t}"
                    data-field="slide.theme" data-index="${i}"
                    ${slide.theme === t ? 'checked' : ''} />
                  <span>${t}</span>
                </label>
              `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function textFields(slide, i) {
  return `
    <div class="field">
      <label class="field__label">Tag</label>
      <input class="field__input" type="text"
        data-field="slide.tag" data-index="${i}" value="${attr(slide.tag)}" />
    </div>
    <div class="field">
      <label class="field__label">Heading</label>
      <textarea class="field__textarea" rows="2"
        data-field="slide.heading" data-index="${i}">${attr(slide.heading)}</textarea>
    </div>
    <div class="field">
      <label class="field__label">Body</label>
      <textarea class="field__textarea" rows="2"
        data-field="slide.body" data-index="${i}">${attr(slide.body)}</textarea>
    </div>
  `;
}

function overrideColorsBlock(slide, i) {
  const overrides = slide.colors ?? {};
  const anyOverride = Object.values(overrides).some(Boolean);
  const discId = `slide:${slide.id ?? `idx-${i}`}:overrides`;
  return `
    <details class="disclosure" data-disclosure-id="${attr(discId)}"
      ${discOpen(discId, anyOverride) ? 'open' : ''}>
      <summary>Override colors (slide ${i + 1})</summary>
      <div class="disclosure__body">
        <p class="dropzone__hint" style="margin:0 0 8px;text-align:left;">
          Leave blank to inherit the theme. A value here wins over the theme.
        </p>
        ${TOKEN_GROUPS.map(
          (group) => `
            <div class="edit-section__title" style="margin-top:6px;">${group.label}</div>
            <div class="token-grid">
              ${group.keys
                .map((key) =>
                  slideColorField(
                    TOKEN_LABELS[key] ?? key,
                    i,
                    key,
                    overrides[key]
                  )
                )
                .join('')}
            </div>
          `
        ).join('')}
        <div style="margin-top:8px;">
          <button class="btn btn--ghost btn--small"
            data-action="clear-slide-colors" data-index="${i}"
            ${anyOverride ? '' : 'disabled'}>Reset all overrides</button>
        </div>
      </div>
    </details>
  `;
}

function slideColorField(label, slideIndex, key, value) {
  const hex = toHex(value) || '#000000';
  const hasValue = !!value;
  return `
    <div class="field">
      <label class="field__label">${escape(label)}</label>
      <div class="color-chip ${hasValue ? '' : 'is-inherit'}">
        <input type="color"
          data-field="slide.colors.${key}" data-index="${slideIndex}"
          value="${attr(hex)}" />
        <input type="text"
          data-field="slide.colors.${key}" data-index="${slideIndex}"
          value="${attr(value ?? '')}" placeholder="inherit"
          style="flex:1;border:none;background:transparent;font-size:11px;min-width:0;" />
        <button type="button" class="color-chip__clear"
          data-action="clear-slide-color" data-index="${slideIndex}" data-key="${key}"
          ${hasValue ? '' : 'disabled'} title="Reset to theme">×</button>
      </div>
    </div>
  `;
}

// ------------------------ Per-type fields + lists ------------------------

function typeSpecificFields(slide, i) {
  switch (slide.type) {
    case 'problem':
      return listField('Strikethrough pills', i, 'pills', slide.pills ?? [], 'pill');
    case 'features':
      return listField('Feature rows', i, 'items', slide.items ?? [], 'kv');
    case 'howto':
      return listField('Steps', i, 'steps', slide.steps ?? [], 'step');
    case 'details':
      return (
        listField('Swatches', i, 'swatches', slide.swatches ?? [], 'swatch') +
        listField('Tag pills', i, 'tags', slide.tags ?? [], 'pill')
      );
    case 'solution': {
      const q = slide.quote ?? {};
      return `
        <div class="edit-section__title" style="margin-top:4px;">Prompt / quote</div>
        <div class="field__row">
          <div class="field">
            <label class="field__label">Label</label>
            <input class="field__input" type="text"
              data-field="slide.quote.label" data-index="${i}"
              value="${attr(q.label)}" />
          </div>
          <div class="field">
            <label class="field__label">Quote text</label>
            <input class="field__input" type="text"
              data-field="slide.quote.text" data-index="${i}"
              value="${attr(q.text)}" />
          </div>
        </div>
      `;
    }
    case 'quote': {
      const a = slide.attribution ?? {};
      return `
        <div class="field">
          <label class="field__label">Quote text</label>
          <textarea class="field__textarea" rows="2"
            data-field="slide.text" data-index="${i}">${attr(slide.text)}</textarea>
        </div>
        <div class="field__row">
          <div class="field">
            <label class="field__label">Name</label>
            <input class="field__input" type="text"
              data-field="slide.attribution.name" data-index="${i}"
              value="${attr(a.name)}" />
          </div>
          <div class="field">
            <label class="field__label">Role</label>
            <input class="field__input" type="text"
              data-field="slide.attribution.role" data-index="${i}"
              value="${attr(a.role)}" />
          </div>
        </div>
      `;
    }
    case 'cta': {
      const c = slide.cta ?? {};
      return `
        <div class="edit-section__title" style="margin-top:4px;">CTA button</div>
        <div class="field__row">
          <div class="field">
            <label class="field__label">Button text</label>
            <input class="field__input" type="text"
              data-field="slide.cta.text" data-index="${i}"
              value="${attr(c.text)}" />
          </div>
          <div class="field">
            <label class="field__label">Link URL</label>
            <input class="field__input" type="text"
              data-field="slide.cta.href" data-index="${i}"
              value="${attr(c.href)}" />
          </div>
        </div>
        <div class="field__row">
          ${colorField('Button background', `slide.cta.bgColor`, c.bgColor)}
          ${colorField('Button text', `slide.cta.textColor`, c.textColor)}
        </div>
        <div class="field">
          <label class="field__label" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox"
              data-field="slide.watermark" data-index="${i}"
              ${slide.watermark === false ? '' : 'checked'} />
            Show brand watermark
          </label>
        </div>
      `;
    }
    case 'hero':
      return `
        <div class="field">
          <label class="field__label" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox"
              data-field="slide.watermark" data-index="${i}"
              ${slide.watermark === false ? '' : 'checked'} />
            Show brand watermark
          </label>
        </div>
      `;
    default:
      return '';
  }
}

function listField(title, slideIndex, key, items, variant) {
  const rows = items
    .map((item, j) => rowForVariant(variant, slideIndex, key, item, j))
    .join('');
  return `
    <div class="edit-section__title" style="margin-top:4px;">${title}</div>
    <div class="list-editor">
      ${rows}
      <button class="btn btn--ghost btn--small"
        data-action="list-add" data-index="${slideIndex}"
        data-key="${key}" data-variant="${variant}">+ Add</button>
    </div>
  `;
}

function rowColorChip(field, slideIndex, value) {
  const hex = toHex(value) || '#000000';
  const hasValue = !!value;
  return `
    <div class="color-chip ${hasValue ? '' : 'is-inherit'}">
      <input type="color" data-field="${attr(field)}" data-index="${slideIndex}"
        value="${attr(hex)}" title="Row color" />
      <button type="button" class="color-chip__clear"
        data-action="clear-field" data-field="${attr(field)}" data-index="${slideIndex}"
        ${hasValue ? '' : 'disabled'} title="Reset to inherited">×</button>
    </div>
  `;
}

function rowForVariant(variant, slideIndex, key, item, j) {
  const delBtn = `<button class="icon-btn"
    data-action="list-remove" data-index="${slideIndex}"
    data-key="${key}" data-row="${j}" title="Remove">×</button>`;

  if (variant === 'pill') {
    const text = typeof item === 'string' ? item : item?.text ?? '';
    const color = typeof item === 'object' ? item?.color : '';
    return `
      <div class="list-editor__row list-editor__row--pill">
        <input type="text" data-field="list.${key}.${j}.text" data-index="${slideIndex}"
          value="${attr(text)}" placeholder="Label" />
        ${rowColorChip(`list.${key}.${j}.color`, slideIndex, color)}
        ${delBtn}
      </div>
    `;
  }
  if (variant === 'kv') {
    return `
      <div class="list-editor__row list-editor__row--kv">
        ${bulletPicker(slideIndex, j, item.icon)}
        <input type="text" data-field="list.${key}.${j}.label" data-index="${slideIndex}"
          value="${attr(item.label)}" placeholder="Label" />
        <input type="text" data-field="list.${key}.${j}.description" data-index="${slideIndex}"
          value="${attr(item.description)}" placeholder="Short description" />
        ${rowColorChip(`list.${key}.${j}.labelColor`, slideIndex, item.labelColor)}
        ${delBtn}
      </div>
    `;
  }
  if (variant === 'step') {
    const defaultNum = String(j + 1).padStart(2, '0');
    return `
      <div class="step-editor">
        <div class="list-editor__row list-editor__row--step">
          <input type="text" class="step-editor__num"
            data-field="list.${key}.${j}.number" data-index="${slideIndex}"
            value="${attr(item.number ?? '')}" placeholder="${defaultNum}" />
          <input type="text" data-field="list.${key}.${j}.title" data-index="${slideIndex}"
            value="${attr(item.title)}" placeholder="Step title" />
          <input type="text" data-field="list.${key}.${j}.description" data-index="${slideIndex}"
            value="${attr(item.description)}" placeholder="Step description" />
          ${rowColorChip(`list.${key}.${j}.titleColor`, slideIndex, item.titleColor)}
          ${delBtn}
        </div>
        ${stepImagesStrip(slideIndex, item)}
      </div>
    `;
  }
  if (variant === 'swatch') {
    const hex = toHex(item);
    return `
      <div class="list-editor__row list-editor__row--swatch">
        <input type="color" data-field="list.${key}.${j}" data-index="${slideIndex}"
          value="${attr(hex)}" />
        <input type="text" data-field="list.${key}.${j}" data-index="${slideIndex}"
          value="${attr(item)}" placeholder="#0075de" />
        ${delBtn}
      </div>
    `;
  }
  return '';
}

// Per-step media strip: thumbnails with move/remove + alt input, plus an
// "+ Add image" button that surfaces a hidden file input for that step.
function stepImagesStrip(slideIndex, step) {
  const images = Array.isArray(step?.images) ? step.images : [];
  const stepId = step?.id ?? '';
  const transientKey = `${slideIndex}:${stepId}`;
  const transient = stepUploadStatus.get(transientKey);
  const rows = images
    .map((img, k) => {
      const url =
        (img.localId && getCachedUrl(img.localId)) || img.remoteUrl || '';
      const up = k === 0 ? 'disabled' : '';
      const down = k === images.length - 1 ? 'disabled' : '';
      return `
        <div class="step-image">
          ${
            url
              ? `<img src="${attr(url)}" alt="" class="step-image__thumb" />`
              : `<div class="step-image__thumb step-image__thumb--empty"></div>`
          }
          <input type="text" class="step-image__alt"
            data-field="step-image.alt"
            data-slide-index="${slideIndex}"
            data-step-id="${attr(stepId)}"
            data-image-id="${attr(img.id)}"
            value="${attr(img.alt ?? '')}" placeholder="Caption (optional)" />
          <div class="step-image__controls">
            <button class="icon-btn" data-action="step-image-move"
              data-slide-index="${slideIndex}"
              data-step-id="${attr(stepId)}"
              data-image-id="${attr(img.id)}"
              data-direction="-1" ${up} title="Move up">↑</button>
            <button class="icon-btn" data-action="step-image-move"
              data-slide-index="${slideIndex}"
              data-step-id="${attr(stepId)}"
              data-image-id="${attr(img.id)}"
              data-direction="1" ${down} title="Move down">↓</button>
            <button class="icon-btn" data-action="step-image-remove"
              data-slide-index="${slideIndex}"
              data-step-id="${attr(stepId)}"
              data-image-id="${attr(img.id)}"
              title="Remove">×</button>
          </div>
        </div>
      `;
    })
    .join('');
  const badge = transient ? statusBadge(transient.state, transient.message) : '';
  return `
    <div class="step-images">
      ${rows}
      <div class="step-images__actions">
        <button type="button" class="btn btn--ghost btn--small"
          data-action="step-image-add"
          data-slide-index="${slideIndex}"
          data-step-id="${attr(stepId)}">+ Image</button>
        ${badge}
      </div>
    </div>
  `;
}

// ========================= 5. Image block =================================

function statusBadge(state, message) {
  const cls =
    state === 'uploaded'
      ? 'status-badge--ok'
      : state === 'error'
      ? 'status-badge--err'
      : state === 'offline'
      ? 'status-badge--warn'
      : state === 'uploading'
      ? 'status-badge--info'
      : '';
  return `<span class="status-badge ${cls}">${escape(message)}</span>`;
}

function imageBlock(slide, i) {
  const img = slide.image;
  const hasLocal = !!img?.localId;
  const hasRemote = !!img?.remoteUrl;
  const transient = uploadStatus.get(i);
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

  const thumbUrl =
    (img?.localId && getCachedUrl(img.localId)) || img?.remoteUrl || '';

  const badges = [];
  if (transient) {
    badges.push(statusBadge(transient.state, transient.message));
  } else if (hasLocal && hasRemote) {
    badges.push(statusBadge('uploaded', 'Shared'));
  } else if (hasLocal && !hasRemote && online) {
    badges.push(statusBadge('saved', 'Saved locally'));
  } else if (hasLocal && !hasRemote && !online) {
    badges.push(statusBadge('offline', 'Offline \u2014 not shared'));
  }

  const url = img?.remoteUrl ?? transient?.url ?? '';
  const urlHtml = url
    ? `<div class="dropzone__url">${escape(url)}</div>`
    : '';

  const placements = ['inline', 'background', 'content'];

  return `
    <div class="edit-section__title" style="margin-top:4px;">Image</div>
    <div class="dropzone" data-dropzone data-index="${i}">
      ${
        thumbUrl
          ? `
            <img src="${attr(thumbUrl)}" alt="" class="dropzone__thumb" />
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
              ${badges.join('')}
            </div>
            ${urlHtml}
            <div style="position:relative;z-index:2;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
              <label class="btn btn--secondary btn--small" style="cursor:pointer;">
                Replace
                <input type="file" accept="image/*" data-image-input data-index="${i}" style="display:none;" />
              </label>
              ${
                hasLocal && !hasRemote
                  ? `<button type="button" class="btn btn--ghost btn--small"
                      data-action="share-image" data-index="${i}"
                      ${online ? '' : 'disabled'}>Share link</button>`
                  : ''
              }
              <button type="button" class="btn btn--ghost btn--small"
                data-action="clear-image" data-index="${i}">Remove</button>
            </div>
          `
          : `
            <input type="file" accept="image/*" data-image-input data-index="${i}" />
            <div class="dropzone__hint">Drop or click to choose an image</div>
            ${badges.join('')}
          `
      }
    </div>
    ${
      thumbUrl
        ? `
          <div class="field" style="margin-top:8px;">
            <label class="field__label">Placement</label>
            <div class="chip-group">
              ${placements
                .map(
                  (p) => `
                    <label>
                      <input type="radio" name="placement-${i}" value="${p}"
                        data-field="slide.image.placement" data-index="${i}"
                        ${(img?.placement ?? 'inline') === p ? 'checked' : ''} />
                      <span>${p}</span>
                    </label>
                  `
                )
                .join('')}
            </div>
          </div>
          <div class="field">
            <label class="field__label">Caption</label>
            <input class="field__input" type="text"
              data-field="slide.image.alt" data-index="${i}"
              placeholder="Shown below the image in content mode"
              value="${attr(img?.alt)}" />
          </div>
        `
        : ''
    }
    ${(img?.placement === 'content') ? contentBlocksEditor(slide, i) : ''}
  `;
}

// Editor for the flexible content-blocks layout. Renders the ordered list of
// text/image blocks with reorder + delete controls and an "Add text block"
// button. The image block is rendered as a read-only chip (one per slide).
function contentBlocksEditor(slide, i) {
  const blocks = Array.isArray(slide.blocks) ? slide.blocks : [];
  const rows = blocks
    .map((b, j) => {
      const up = j === 0 ? 'disabled' : '';
      const down = j === blocks.length - 1 ? 'disabled' : '';
      const controls = `
        <div class="block-row__controls">
          <button class="icon-btn" data-action="block-up"
            data-index="${i}" data-block="${attr(b.id)}" ${up} title="Move up">↑</button>
          <button class="icon-btn" data-action="block-down"
            data-index="${i}" data-block="${attr(b.id)}" ${down} title="Move down">↓</button>
          <button class="icon-btn" data-action="block-remove"
            data-index="${i}" data-block="${attr(b.id)}" title="Remove">×</button>
        </div>
      `;
      if (b.type === 'image') {
        return `
          <div class="block-row block-row--image">
            <span class="block-row__chip">Image</span>
            <div class="block-row__hint">Uses the image above. Caption: ${
              slide.image?.alt ? escape(slide.image.alt) : '<em>none</em>'
            }</div>
            ${controls}
          </div>
        `;
      }
      return `
        <div class="block-row block-row--text">
          <textarea class="field__textarea" rows="2"
            data-field="slide.block.text"
            data-index="${i}" data-block="${attr(b.id)}"
            placeholder="Text block">${escape(b.text ?? '')}</textarea>
          ${controls}
        </div>
      `;
    })
    .join('');
  const canAddImage = !blocks.some((b) => b.type === 'image');
  return `
    <div class="edit-section__title" style="margin-top:10px;">Content blocks</div>
    <div class="block-list">
      ${rows || '<div class="block-row__hint">No blocks yet — add one below.</div>'}
    </div>
    <div class="block-list__actions">
      <button type="button" class="btn btn--secondary btn--small"
        data-action="add-text-block" data-index="${i}">+ Text block</button>
      ${
        canAddImage
          ? `<button type="button" class="btn btn--secondary btn--small"
              data-action="add-image-block" data-index="${i}">+ Image block</button>`
          : ''
      }
    </div>
  `;
}

function footerActions() {
  return `
    <button class="btn btn--primary btn--small" data-action="download-current">Download PNG</button>
    <button class="btn btn--primary btn--small" data-action="download-all">Download ZIP</button>
    <button class="btn btn--secondary btn--small" data-action="export-json">Export JSON</button>
    <button class="btn btn--secondary btn--small" data-action="import-json">Import JSON</button>
    <button class="btn btn--danger btn--small" data-action="reset" style="grid-column:span 2;">Reset to defaults</button>
  `;
}

// ========================= Event wiring ===================================

function attachGlobalHandlers() {
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('click', onClick);
  // <details> fire `toggle` on open/close. Capture so we catch bubbles in
  // every browser and store the state by data-disclosure-id.
  root.addEventListener(
    'toggle',
    (e) => {
      const d = e.target;
      if (!(d instanceof HTMLDetailsElement)) return;
      const id = d.dataset.disclosureId;
      if (!id) return;
      disclosureState.set(id, d.open);
    },
    true
  );

  root.addEventListener('change', (e) => {
    const input = e.target.closest('[data-image-input]');
    if (!input) return;
    const file = input.files?.[0];
    if (!file || !isImageFile(file)) return;
    const slideIndex = Number(input.dataset.index);
    runUploadForSlide(slideIndex, file);
    input.value = '';
  });

  root.addEventListener('dragover', (e) => {
    const dz = e.target.closest('[data-dropzone]');
    if (!dz) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dz.classList.add('is-dragover');
  });
  root.addEventListener('dragleave', (e) => {
    const dz = e.target.closest('[data-dropzone]');
    if (!dz) return;
    dz.classList.remove('is-dragover');
  });
  root.addEventListener('drop', (e) => {
    const dz = e.target.closest('[data-dropzone]');
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove('is-dragover');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const slideIndex = Number(dz.dataset.index);
    runUploadForSlide(slideIndex, file);
  });
}

function runUploadForSlide(slideIndex, file) {
  applyImageToSlide(slideIndex, file, (status) => {
    uploadStatus.set(slideIndex, status);
    render();
    // Auto-clear success/offline banners after a moment.
    if (status.state === 'uploaded' || status.state === 'offline') {
      setTimeout(() => {
        if (uploadStatus.get(slideIndex) === status) {
          uploadStatus.delete(slideIndex);
          render();
        }
      }, 3500);
    }
  });
}

// Opens a throwaway file picker for adding a new per-step image. Each pick
// ingests the blob, appends it to the step's images list, and (when online)
// retries tmpfiles in the background.
function openStepImagePicker(slideIndex, stepId) {
  if (Number.isNaN(slideIndex) || !stepId) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file || !isImageFile(file)) return;
    await runStepImageUpload(slideIndex, stepId, file);
  });
  document.body.appendChild(input);
  input.click();
}

function openBrandAvatarPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file || !isImageFile(file)) return;
    const themeId = getState().activeThemeId;
    const prev = getActiveTheme().brand?.avatarLocalId;
    try {
      const { localId, remotePromise } = await ingestImage(file);
      updateBrand({
        avatarLocalId: localId,
        avatarRemoteUrl: undefined,
        avatarUrl: undefined,
      });
      if (prev && prev !== localId) deleteImage(prev).catch(() => {});
      const result = await remotePromise;
      if (result?.url && getState().activeThemeId === themeId) {
        updateBrand({ avatarRemoteUrl: result.url });
      }
    } catch (err) {
      console.warn('[brand avatar]', err);
    }
  });
  input.click();
}

async function runStepImageUpload(slideIndex, stepId, file) {
  const key = `${slideIndex}:${stepId}`;
  const setStatus = (status) => {
    if (!status) stepUploadStatus.delete(key);
    else stepUploadStatus.set(key, status);
    render();
  };
  try {
    const { localId, remotePromise } = await ingestImage(file);
    addStepImage(slideIndex, stepId, {
      localId,
      remoteUrl: null,
      alt: '',
    });
    // Find the image id we just assigned so we can patch remoteUrl later.
    const stepAfter = getState().slides[slideIndex]?.steps?.find(
      (s) => s.id === stepId
    );
    const justAdded = stepAfter?.images?.[stepAfter.images.length - 1];
    const imageId = justAdded?.id;

    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    setStatus({
      state: online ? 'uploading' : 'offline',
      message: online ? 'Uploading to tmpfiles\u2026' : 'Offline \u2014 saved locally',
    });
    const result = await remotePromise;
    if (result?.url && imageId) {
      updateStepImage(slideIndex, stepId, imageId, { remoteUrl: result.url });
      setStatus({ state: 'uploaded', message: 'Shared' });
    } else if (result?.offline) {
      setStatus({ state: 'offline', message: 'Offline \u2014 not shared' });
    } else if (result?.error) {
      setStatus({ state: 'error', message: result.error });
    } else {
      setStatus(null);
    }
    if (result?.url || result?.offline) {
      setTimeout(() => {
        if (stepUploadStatus.get(key)?.state !== 'uploading') setStatus(null);
      }, 3500);
    }
  } catch (err) {
    setStatus({ state: 'error', message: err.message ?? String(err) });
  }
}

function onInput(e) {
  const el = e.target;

  // Native color pickers fire `input` continuously while the OS dialog is
  // open, and each commit re-renders the editor which replaces this DOM node
  // and tears down the picker. Only commit on `change` (fired when the
  // picker closes) so dragging through the color wheel doesn't snap-commit.
  if (el.type === 'color' && e.type === 'input') return;

  // Font-family picker: select between presets and a 'Custom…' free-text mode.
  const fontSlot = el.dataset?.fontPicker;
  if (fontSlot) {
    const v = el.value;
    if (v === '__custom__') {
      customFontMode[fontSlot] = true;
      render();
    } else if (v) {
      customFontMode[fontSlot] = false;
      updateActiveTheme({ fonts: { [fontSlot]: v } });
    }
    return;
  }

  // Feature-row bullet picker: presets + 'Custom…'.
  const iconSlot = el.dataset?.iconPicker;
  if (iconSlot !== undefined) {
    const v = el.value;
    const rowIndex = Number(el.dataset.row);
    const slideIndex = Number(el.dataset.index);
    if (v === '__custom__') {
      customIconMode.set(iconKey(slideIndex, rowIndex), true);
      render();
    } else if (v !== undefined) {
      customIconMode.delete(iconKey(slideIndex, rowIndex));
      applyListPath(slideIndex, `items.${rowIndex}.icon`, v);
    }
    return;
  }

  const field = el.dataset?.field;
  if (!field) return;
  const index = el.dataset.index !== undefined ? Number(el.dataset.index) : null;
  const value = extractValue(el);

  // Theme library selector.
  if (field === 'activeThemeId') {
    setActiveTheme(value);
    return;
  }

  // Theme name.
  if (field === 'theme.name') {
    updateActiveTheme({ name: value });
    return;
  }

  // Brand / caption / colors / fonts on the active theme.
  if (field.startsWith('brand.')) {
    const key = field.slice('brand.'.length);
    if (key === 'avatarUrl') {
      const v = String(value ?? '').trim();
      if (!v) {
        updateBrand({ avatarUrl: undefined });
        return;
      }
      updateBrand({
        avatarUrl: v,
        avatarLocalId: undefined,
        avatarRemoteUrl: undefined,
      });
      return;
    }
    if (key === 'logoNameColor' || key === 'logoNameSuffixColor') {
      updateBrand({ [key]: value || undefined });
      mirrorPairedInputs(field, value);
      return;
    }
    updateBrand({ [key]: value });
    return;
  }
  if (field.startsWith('caption.')) {
    updateCaption({ [field.slice('caption.'.length)]: value });
    return;
  }
  if (field.startsWith('fonts.')) {
    updateActiveTheme({
      fonts: { [field.slice('fonts.'.length)]: value },
    });
    return;
  }
  if (field.startsWith('colors.')) {
    updateColors({ [field.slice('colors.'.length)]: value });
    mirrorPairedInputs(field, value);
    return;
  }

  // Token editor: data-field="tokens.light.tagColor"
  if (field.startsWith('tokens.')) {
    const [, mode, key] = field.split('.');
    if (mode && key) {
      updateActiveTokens(mode, { [key]: value });
      mirrorPairedInputs(field, value);
    }
    return;
  }

  // Per-slide overrides: data-field="slide.colors.tagColor"
  if (field.startsWith('slide.colors.') && index !== null) {
    const key = field.slice('slide.colors.'.length);
    updateSlide(index, {
      colors: { [key]: value || undefined },
    });
    mirrorPairedInputs(field, value, index);
    return;
  }

  // Content-blocks: data-field="slide.block.text" data-index data-block
  if (field === 'slide.block.text' && index !== null) {
    const blockId = el.dataset.block;
    if (blockId) updateBlock(index, blockId, { text: value });
    return;
  }

  // Per-step image alt text: data-field="step-image.alt" with data-slide-index,
  // data-step-id, data-image-id. Independent from list.* paths because nested
  // lists need three indices.
  if (field === 'step-image.alt') {
    const slideIndex = Number(el.dataset.slideIndex);
    const stepId = el.dataset.stepId;
    const imageId = el.dataset.imageId;
    if (!Number.isNaN(slideIndex) && stepId && imageId) {
      updateStepImage(slideIndex, stepId, imageId, { alt: value });
    }
    return;
  }

  if (field.startsWith('slide.') && index !== null) {
    applySlidePath(index, field.slice('slide.'.length), value);
    return;
  }

  if (field.startsWith('list.') && index !== null) {
    applyListPath(index, field.slice('list.'.length), value);
    return;
  }
}

function mirrorPairedInputs(field, value, index) {
  const sel = `[data-field="${cssEscape(field)}"]` +
    (index !== undefined ? `[data-index="${cssEscape(index)}"]` : '');
  const siblings = root.querySelectorAll(sel);
  const active = document.activeElement;
  siblings.forEach((sibling) => {
    if (sibling === active) return;
    if (sibling.type === 'color') sibling.value = toHex(value) || '#000000';
    else if (sibling.type === 'text') sibling.value = value ?? '';
  });
}

function onClick(e) {
  const card = e.target.closest('[data-action="select-slide"]');
  if (card && !e.target.closest('[data-stop-select]')) {
    setSelectedIndex(Number(card.dataset.index));
    return;
  }

  const actionable = e.target.closest('[data-action]');
  if (!actionable) return;
  const action = actionable.dataset.action;
  const index = actionable.dataset.index !== undefined ? Number(actionable.dataset.index) : null;

  switch (action) {
    case 'token-tab':
      activeTokenTab = actionable.dataset.mode;
      render();
      break;

    // ---- theme library
    case 'new-theme': {
      const seed = {
        name: 'New theme',
        brand: { ...getActiveTheme().brand },
        caption: { ...getActiveTheme().caption },
        colors: { ...getActiveTheme().colors },
        fonts: { ...getActiveTheme().fonts },
        tokens: blankTokens(),
      };
      createTheme(seed);
      toast('Created theme');
      break;
    }
    case 'duplicate-theme':
      duplicateTheme(getActiveTheme().id);
      toast('Duplicated theme');
      break;
    case 'rename-theme': {
      const current = getActiveTheme();
      const next = prompt('Rename theme', current.name);
      if (next && next.trim()) renameTheme(current.id, next.trim());
      break;
    }
    case 'delete-theme': {
      const current = getActiveTheme();
      if (getState().themes.length <= 1) return;
      if (confirm(`Delete theme "${current.name}"?`)) {
        deleteTheme(current.id);
        toast('Deleted theme');
      }
      break;
    }
    case 'export-theme':
      exportCurrentTheme();
      break;
    case 'import-theme':
      importThemeFromFile();
      break;

    // ---- slide list
    case 'move-up':
      moveSlide(index, -1);
      if (getSelectedIndex() === index) setSelectedIndex(Math.max(0, index - 1));
      break;
    case 'move-down':
      moveSlide(index, 1);
      if (getSelectedIndex() === index)
        setSelectedIndex(Math.min(getState().slides.length - 1, index + 1));
      break;
    case 'duplicate':
      duplicateSlide(index);
      setSelectedIndex(index + 1);
      break;
    case 'delete': {
      const prev = getSelectedIndex();
      deleteSlide(index);
      setSelectedIndex(Math.min(prev, getState().slides.length - 1));
      break;
    }
    case 'add-slide': {
      const select = root.querySelector('#add-slide-type');
      const type = select?.value ?? 'features';
      const at = addSlide(type);
      setSelectedIndex(at);
      break;
    }

    // ---- list rows + field clears
    case 'list-add':
      appendListRow(index, actionable.dataset.key, actionable.dataset.variant);
      break;
    case 'list-remove':
      removeListRow(index, actionable.dataset.key, Number(actionable.dataset.row));
      break;
    case 'clear-field': {
      const field = actionable.dataset.field;
      if (field?.startsWith('list.')) {
        applyListPath(index, field.slice('list.'.length), '');
      }
      break;
    }
    case 'clear-slide-color':
      updateSlide(index, {
        colors: { [actionable.dataset.key]: undefined },
      });
      break;
    case 'clear-slide-colors':
      updateSlide(index, { colors: null });
      break;

    // ---- image block
    case 'clear-image':
      updateSlide(index, { image: null });
      uploadStatus.delete(index);
      break;
    case 'share-image':
      shareSlideImage(index);
      break;

    // ---- per-step images
    case 'step-image-add':
      openStepImagePicker(
        Number(actionable.dataset.slideIndex),
        actionable.dataset.stepId
      );
      break;
    case 'step-image-move':
      moveStepImage(
        Number(actionable.dataset.slideIndex),
        actionable.dataset.stepId,
        actionable.dataset.imageId,
        Number(actionable.dataset.direction)
      );
      break;
    case 'step-image-remove':
      removeStepImage(
        Number(actionable.dataset.slideIndex),
        actionable.dataset.stepId,
        actionable.dataset.imageId
      );
      break;

    case 'brand-avatar-pick':
      openBrandAvatarPicker();
      break;
    case 'brand-avatar-remove': {
      const b = getActiveTheme().brand;
      if (b?.avatarLocalId) deleteImage(b.avatarLocalId).catch(() => {});
      updateBrand({
        avatarLocalId: undefined,
        avatarRemoteUrl: undefined,
        avatarUrl: undefined,
      });
      break;
    }

    // ---- content blocks
    case 'block-up':
      moveBlock(index, actionable.dataset.block, -1);
      break;
    case 'block-down':
      moveBlock(index, actionable.dataset.block, 1);
      break;
    case 'block-remove':
      removeBlock(index, actionable.dataset.block);
      break;
    case 'add-text-block':
      addBlock(index, { type: 'text', text: '' });
      break;
    case 'add-image-block':
      addBlock(index, { type: 'image' });
      break;

    // ---- footer
    case 'download-current':
      doExportSingle(getSelectedIndex());
      break;
    case 'download-all':
      doExportZip();
      break;
    case 'export-json':
      exportStateJson();
      break;
    case 'import-json':
      importStateJson();
      break;
    case 'reset':
      if (confirm('Reset carousel to defaults? This clears your edits.')) {
        resetDefaults();
        setSelectedIndex(0);
        toast('Reset to defaults');
      }
      break;
    default:
      break;
  }
}

// ---------- Slide-path application ----------------------------------------

function applySlidePath(index, path, value) {
  const current = getState().slides[index];
  if (!current) return;

  if (path === 'watermark') {
    updateSlide(index, { watermark: !!value });
    return;
  }
  if (
    path === 'type' ||
    path === 'theme' ||
    path === 'tag' ||
    path === 'heading' ||
    path === 'body' ||
    path === 'text'
  ) {
    updateSlide(index, { [path]: value });
    return;
  }
  if (path === 'image.placement' || path === 'image.alt') {
    const key = path.split('.')[1];
    updateSlide(index, { image: { [key]: value } });
    return;
  }
  if (path.startsWith('quote.')) {
    const key = path.split('.')[1];
    updateSlide(index, { quote: { ...(current.quote ?? {}), [key]: value } });
    return;
  }
  if (path.startsWith('attribution.')) {
    const key = path.split('.')[1];
    updateSlide(index, {
      attribution: { ...(current.attribution ?? {}), [key]: value },
    });
    return;
  }
  if (path.startsWith('cta.')) {
    const key = path.split('.')[1];
    updateSlide(index, { cta: { ...(current.cta ?? {}), [key]: value } });
    return;
  }
}

function applyListPath(index, rest, value) {
  const parts = rest.split('.');
  const key = parts[0];
  const row = Number(parts[1]);
  const field = parts[2];
  const current = getState().slides[index];
  const list = Array.isArray(current?.[key]) ? [...current[key]] : [];
  if (field) {
    const item =
      typeof list[row] === 'object' && list[row] !== null
        ? { ...list[row] }
        : typeof list[row] === 'string'
        ? { text: list[row] }
        : {};
    if (value === '' || value === null || value === undefined) {
      delete item[field];
    } else {
      item[field] = value;
    }
    list[row] = item;
  } else {
    list[row] = value;
  }
  updateSlide(index, { [key]: list });
}

function appendListRow(index, key, variant) {
  const current = getState().slides[index];
  const list = Array.isArray(current?.[key]) ? [...current[key]] : [];
  if (variant === 'pill') list.push({ text: 'New pill' });
  else if (variant === 'kv') list.push({ icon: '◇', label: 'New feature', description: '' });
  else if (variant === 'step') list.push({ title: 'New step', description: '' });
  else if (variant === 'swatch') list.push('#0075de');
  updateSlide(index, { [key]: list });
}

function removeListRow(index, key, row) {
  const current = getState().slides[index];
  const list = Array.isArray(current?.[key]) ? current[key].filter((_, i) => i !== row) : [];
  updateSlide(index, { [key]: list });
}

// ---------- Theme + state import / export --------------------------------

function exportCurrentTheme() {
  const theme = getActiveTheme();
  const json = exportTheme(theme.id);
  downloadBlob(
    json,
    `${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'theme'}.carousel-theme.json`,
    'application/json'
  );
  toast('Theme JSON downloaded');
}

function importThemeFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      importTheme(text);
      toast('Theme imported');
    } catch (err) {
      alert(`Theme import failed: ${err.message}`);
    }
  });
  input.click();
}

function exportStateJson() {
  downloadBlob(toJSON(), 'carousel.json', 'application/json');
  toast('Exported JSON');
}

function importStateJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      loadJSON(text);
      setSelectedIndex(0);
      toast('Imported JSON');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  });
  input.click();
}

function downloadBlob(text, filename, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Share-link retry ---------------------------------------------

async function shareSlideImage(slideIndex) {
  const slide = getState().slides[slideIndex];
  const localId = slide?.image?.localId;
  if (!localId) return;
  uploadStatus.set(slideIndex, { state: 'uploading', message: 'Uploading\u2026' });
  render();
  try {
    const blob = await getImage(localId);
    if (!blob) throw new Error('Image blob missing');
    const result = await uploadToTmpfiles(blob);
    if (result?.url) {
      updateSlide(slideIndex, { image: { remoteUrl: result.url } });
      uploadStatus.set(slideIndex, {
        state: 'uploaded',
        message: 'Shared',
        url: result.url,
      });
    } else {
      throw new Error('Upload did not return a URL');
    }
  } catch (err) {
    uploadStatus.set(slideIndex, {
      state: 'error',
      message: err.message ?? 'Upload failed',
    });
  } finally {
    render();
  }
}

// ---------- Export helpers ------------------------------------------------

async function doExportSingle(index) {
  try {
    toast('Rendering slide…');
    await exportSlidePng(index);
    toast('Downloaded slide PNG');
  } catch (err) {
    console.error(err);
    toast(`Export failed: ${err.message}`);
  }
}

async function doExportZip() {
  try {
    toast('Rendering all slides…');
    await exportAllZip();
    toast('Downloaded ZIP');
  } catch (err) {
    console.error(err);
    toast(`Export failed: ${err.message}`);
  }
}

// ---------- Focus preservation -------------------------------------------

function captureFocus(container) {
  const active = document.activeElement;
  if (!active || !container.contains(active)) return null;
  return {
    field: active.dataset?.field,
    index: active.dataset?.index,
    block: active.dataset?.block,
    name: active.name,
    // Disambiguates color vs text inputs that share the same data-field
    // (colorField renders both side-by-side).
    type: active.tagName === 'INPUT' ? active.type : undefined,
    selectionStart: active.selectionStart ?? null,
    selectionEnd: active.selectionEnd ?? null,
  };
}

function restoreFocus(container, info) {
  if (!info) return;
  let selector = null;
  if (info.field) {
    selector = `[data-field="${cssEscape(info.field)}"]`;
    if (info.index !== undefined) selector += `[data-index="${cssEscape(info.index)}"]`;
    if (info.block !== undefined) selector += `[data-block="${cssEscape(info.block)}"]`;
    if (info.type) selector += `[type="${cssEscape(info.type)}"]`;
  } else if (info.name) {
    selector = `[name="${cssEscape(info.name)}"]`;
  }
  if (!selector) return;
  const el = container.querySelector(selector);
  if (!el) return;
  el.focus();
  try {
    if (info.selectionStart !== null && 'setSelectionRange' in el) {
      el.setSelectionRange(info.selectionStart, info.selectionEnd ?? info.selectionStart);
    }
  } catch {
    /* unsupported for this input type */
  }
}

// ---------- Utilities -----------------------------------------------------

function extractValue(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'radio') return el.value;
  return el.value;
}

function toHex(value) {
  if (typeof value !== 'string') return '';
  const m = value.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1].toLowerCase()}`;
  const short = value.trim().match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '';
}

function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const attr = escape;

function cssEscape(value) {
  return String(value).replace(/(["\\\]])/g, '\\$1');
}

let toastTimer;
function toast(message) {
  const t = root?.querySelector('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
}
