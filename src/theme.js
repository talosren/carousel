// ---------------------------------------------------------------------------
// Theme tokens — the single place to re-skin the entire carousel.
// Each theme owns:
//   id        stable identifier (used by state.activeThemeId)
//   name      user-visible label
//   brand     { name, handle, initials, subtitle, icon,
//               avatarUrl?, avatarLocalId?, avatarRemoteUrl?,
//               logoNameSuffix?, logoNameFontSize?, logoNameColor?, logoNameSuffixColor?,
//               logoAvatarRadius? }
//   caption   { text, meta }
//   colors    palette primitives (primary, gradients, ink, surfaces)
//   tokens    per-mode element colors: { light, dark, brand }
//   fonts     { display, body }
// At boot applyTheme() walks the theme and writes every entry onto :root
// as a CSS custom property so every component picks them up.
// ---------------------------------------------------------------------------

// Token keys are camelCase and map 1:1 to the CSS variables used in
// src/styles.css; `tagColor` becomes `--tag-color-{mode}` etc.
export const TOKEN_KEYS = [
  'tagColor',
  'headingColor',
  'bodyColor',
  'slideBg',
  'slideScrim',
  'pillBg',
  'pillBorder',
  'pillColor',
  'pillStrikeColor',
  'pillStrikeBorder',
  'featureIcon',
  'featureLabel',
  'featureDesc',
  'featureBorder',
  'stepNum',
  'stepTitle',
  'stepDesc',
  'stepBorder',
  'watermarkColor',
  'ctaBg',
  'ctaText',
  'logoBg',
  'logoText',
  'logoName',
  'promptBg',
  'promptBorder',
  'promptLabel',
  'promptText',
  'mediaBorder',
  'mediaBg',
];

// UI groups for the editor panel. Keeping this near the token list keeps
// additions easy to track.
export const TOKEN_GROUPS = [
  {
    label: 'Text',
    keys: ['tagColor', 'headingColor', 'bodyColor', 'watermarkColor'],
  },
  {
    label: 'Surface',
    keys: ['slideBg', 'slideScrim'],
  },
  {
    label: 'Pills',
    keys: [
      'pillBg',
      'pillBorder',
      'pillColor',
      'pillStrikeColor',
      'pillStrikeBorder',
    ],
  },
  {
    label: 'Feature rows',
    keys: ['featureIcon', 'featureLabel', 'featureDesc', 'featureBorder'],
  },
  {
    label: 'Steps',
    keys: ['stepNum', 'stepTitle', 'stepDesc', 'stepBorder'],
  },
  {
    label: 'CTA & logo',
    keys: ['ctaBg', 'ctaText', 'logoBg', 'logoText', 'logoName'],
  },
  {
    label: 'Prompt & media',
    keys: [
      'promptBg',
      'promptBorder',
      'promptLabel',
      'promptText',
      'mediaBorder',
      'mediaBg',
    ],
  },
];

export const TOKEN_LABELS = {
  tagColor: 'Tag color',
  headingColor: 'Heading color',
  bodyColor: 'Body color',
  slideBg: 'Slide background',
  slideScrim: 'Image scrim',
  pillBg: 'Pill fill',
  pillBorder: 'Pill border',
  pillColor: 'Pill text',
  pillStrikeColor: 'Strike pill text',
  pillStrikeBorder: 'Strike pill border',
  featureIcon: 'Feature icon',
  featureLabel: 'Feature label',
  featureDesc: 'Feature description',
  featureBorder: 'Feature divider',
  stepNum: 'Step number',
  stepTitle: 'Step title',
  stepDesc: 'Step description',
  stepBorder: 'Step divider',
  watermarkColor: 'Watermark',
  ctaBg: 'CTA background',
  ctaText: 'CTA text',
  logoBg: 'Logo circle',
  logoText: 'Logo letter',
  logoName: 'Logo name',
  promptBg: 'Prompt background',
  promptBorder: 'Prompt border',
  promptLabel: 'Prompt label',
  promptText: 'Prompt text',
  mediaBorder: 'Media border',
  mediaBg: 'Media background',
};

export const TOKEN_MODES = ['light', 'dark', 'brand'];

// Palette primitives written as --brand-primary, --gradient-from, etc.
export const COLOR_KEYS = [
  'primary',
  'primaryDark',
  'navy',
  'light',
  'dark',
  'ink',
  'inkMuted',
  'inkFaint',
  'gradientFrom',
  'gradientTo',
  'whisper',
];

const notionLight = {
  tagColor: '#0075de',
  headingColor: 'rgba(0,0,0,0.95)',
  bodyColor: '#615d59',
  slideBg: '#f6f5f4',
  slideScrim:
    'linear-gradient(180deg, rgba(246,245,244,0.55) 0%, rgba(246,245,244,0.78) 60%, rgba(246,245,244,0.9) 100%)',
  pillBg: 'rgba(0,0,0,0.04)',
  pillBorder: 'rgba(0,0,0,0.06)',
  pillColor: '#615d59',
  pillStrikeColor: 'rgba(0,0,0,0.4)',
  pillStrikeBorder: 'rgba(0,0,0,0.12)',
  featureIcon: '#0075de',
  featureLabel: 'rgba(0,0,0,0.95)',
  featureDesc: '#615d59',
  featureBorder: 'rgba(0,0,0,0.1)',
  stepNum: '#0075de',
  stepTitle: 'rgba(0,0,0,0.95)',
  stepDesc: '#615d59',
  stepBorder: 'rgba(0,0,0,0.1)',
  watermarkColor: 'rgba(0,0,0,0.95)',
  ctaBg: '#ffffff',
  ctaText: '#005bab',
  logoBg: '#0075de',
  logoText: '#ffffff',
  logoName: 'rgba(0,0,0,0.95)',
  promptBg: 'rgba(0,0,0,0.06)',
  promptBorder: 'rgba(0,0,0,0.08)',
  promptLabel: '#615d59',
  promptText: 'rgba(0,0,0,0.95)',
  mediaBorder: 'rgba(0,0,0,0.1)',
  mediaBg: 'rgba(0,0,0,0.03)',
};

const notionDark = {
  tagColor: '#f6f5f4',
  headingColor: '#ffffff',
  bodyColor: 'rgba(255,255,255,0.72)',
  slideBg: '#31302e',
  slideScrim:
    'linear-gradient(180deg, rgba(49,48,46,0.35) 0%, rgba(49,48,46,0.75) 60%, rgba(49,48,46,0.92) 100%)',
  pillBg: 'rgba(255,255,255,0.06)',
  pillBorder: 'rgba(255,255,255,0.08)',
  pillColor: '#f6f5f4',
  pillStrikeColor: 'rgba(255,255,255,0.5)',
  pillStrikeBorder: 'rgba(255,255,255,0.12)',
  featureIcon: '#ffffff',
  featureLabel: '#ffffff',
  featureDesc: 'rgba(255,255,255,0.65)',
  featureBorder: 'rgba(255,255,255,0.08)',
  stepNum: '#ffffff',
  stepTitle: '#ffffff',
  stepDesc: 'rgba(255,255,255,0.65)',
  stepBorder: 'rgba(255,255,255,0.08)',
  watermarkColor: '#ffffff',
  ctaBg: '#ffffff',
  ctaText: '#31302e',
  logoBg: '#ffffff',
  logoText: '#0075de',
  logoName: '#ffffff',
  promptBg: 'rgba(0,0,0,0.18)',
  promptBorder: 'rgba(255,255,255,0.1)',
  promptLabel: 'rgba(255,255,255,0.55)',
  promptText: '#ffffff',
  mediaBorder: 'rgba(255,255,255,0.16)',
  mediaBg: 'rgba(255,255,255,0.04)',
};

const notionBrand = {
  tagColor: 'rgba(255,255,255,0.6)',
  headingColor: '#ffffff',
  bodyColor: 'rgba(255,255,255,0.82)',
  slideBg: 'linear-gradient(135deg, #0075de 0%, #213183 100%)',
  slideScrim:
    'linear-gradient(180deg, rgba(0,117,222,0.35) 0%, rgba(33,49,131,0.72) 60%, rgba(33,49,131,0.92) 100%)',
  pillBg: 'rgba(255,255,255,0.1)',
  pillBorder: 'rgba(255,255,255,0.16)',
  pillColor: '#ffffff',
  pillStrikeColor: 'rgba(255,255,255,0.55)',
  pillStrikeBorder: 'rgba(255,255,255,0.2)',
  featureIcon: '#ffffff',
  featureLabel: '#ffffff',
  featureDesc: 'rgba(255,255,255,0.75)',
  featureBorder: 'rgba(255,255,255,0.16)',
  stepNum: '#ffffff',
  stepTitle: '#ffffff',
  stepDesc: 'rgba(255,255,255,0.75)',
  stepBorder: 'rgba(255,255,255,0.16)',
  watermarkColor: '#ffffff',
  ctaBg: '#ffffff',
  ctaText: '#005bab',
  logoBg: '#ffffff',
  logoText: '#0075de',
  logoName: '#ffffff',
  promptBg: 'rgba(0,0,0,0.18)',
  promptBorder: 'rgba(255,255,255,0.1)',
  promptLabel: 'rgba(255,255,255,0.55)',
  promptText: '#ffffff',
  mediaBorder: 'rgba(255,255,255,0.2)',
  mediaBg: 'rgba(255,255,255,0.06)',
};

const midnightLight = {
  ...notionLight,
  tagColor: '#7a5cff',
  featureIcon: '#7a5cff',
  stepNum: '#7a5cff',
  ctaText: '#4b36b5',
  logoBg: '#1a1630',
  logoText: '#ffffff',
};

const midnightDark = {
  ...notionDark,
  tagColor: '#b4a7ff',
  slideBg: '#0e0b21',
  bodyColor: 'rgba(255,255,255,0.7)',
  featureIcon: '#b4a7ff',
  stepNum: '#b4a7ff',
  ctaBg: '#7a5cff',
  ctaText: '#ffffff',
  logoBg: '#7a5cff',
  logoText: '#ffffff',
};

const midnightBrand = {
  ...notionBrand,
  slideBg: 'linear-gradient(135deg, #7a5cff 0%, #1a1630 100%)',
  slideScrim:
    'linear-gradient(180deg, rgba(122,92,255,0.3) 0%, rgba(26,22,48,0.7) 60%, rgba(26,22,48,0.92) 100%)',
  ctaBg: '#ffffff',
  ctaText: '#4b36b5',
};

export const notionTheme = {
  id: 'theme-notion',
  name: 'Notion Default',
  brand: {
    name: 'Notion',
    handle: '@notion',
    subtitle: 'Sponsored',
    initials: 'N',
    icon: null,
  },
  caption: {
    text:
      'The workspace that thinks with you. A single home for notes, docs, and projects — quietly organized, deeply yours.',
    meta: '2 HOURS AGO',
  },
  colors: {
    primary: '#0075de',
    primaryDark: '#005bab',
    navy: '#213183',
    light: '#f6f5f4',
    dark: '#31302e',
    ink: 'rgba(0,0,0,0.95)',
    inkMuted: '#615d59',
    inkFaint: '#a39e98',
    gradientFrom: '#0075de',
    gradientTo: '#213183',
    whisper: 'rgba(0,0,0,0.1)',
  },
  tokens: {
    light: { ...notionLight },
    dark: { ...notionDark },
    brand: { ...notionBrand },
  },
  fonts: {
    display: "'Instrument Serif', Georgia, serif",
    body: "'Inter', -apple-system, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
};

export const midnightTheme = {
  id: 'theme-midnight',
  name: 'Midnight',
  brand: {
    name: 'Midnight',
    handle: '@midnight.labs',
    subtitle: 'Sponsored',
    initials: 'M',
    icon: null,
  },
  caption: {
    text:
      'A calm, high-contrast canvas for late-night thinking. Violet rhythm, soft stars, focused work.',
    meta: '5 HOURS AGO',
  },
  colors: {
    primary: '#7a5cff',
    primaryDark: '#4b36b5',
    navy: '#1a1630',
    light: '#f4f2ff',
    dark: '#0e0b21',
    ink: 'rgba(0,0,0,0.95)',
    inkMuted: '#5b5772',
    inkFaint: '#a29ebc',
    gradientFrom: '#7a5cff',
    gradientTo: '#1a1630',
    whisper: 'rgba(0,0,0,0.1)',
  },
  tokens: {
    light: { ...midnightLight },
    dark: { ...midnightDark },
    brand: { ...midnightBrand },
  },
  fonts: {
    display: "'Instrument Serif', Georgia, serif",
    body: "'Inter', -apple-system, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
};

export const DEFAULT_THEMES = [notionTheme, midnightTheme];

// Back-compat: legacy imports of `theme` should still work (used by store v1
// migration). Points at the Notion default.
export const theme = notionTheme;

// camelCase -> CSS kebab-case used as the property name prefix.
function cssVar(name) {
  return `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

// Build a blank-but-valid tokens map cloned from the Notion defaults. Used when
// a user adds a new theme from scratch so every key has a sensible starting
// value.
export function blankTokens() {
  return {
    light: { ...notionLight },
    dark: { ...notionDark },
    brand: { ...notionBrand },
  };
}

// Writes every color / token / font onto :root as a CSS variable. Supports
// partial themes (missing keys fall back to whatever is already set).
export function applyTheme(t = notionTheme) {
  if (!t) return;
  const root = document.documentElement;
  const { colors = {}, fonts = {}, tokens = {} } = t;

  // Palette primitives (--brand-primary, --gradient-from, ...).
  if (colors.primary) root.style.setProperty('--brand-primary', colors.primary);
  if (colors.primaryDark)
    root.style.setProperty('--brand-primary-dark', colors.primaryDark);
  if (colors.navy) root.style.setProperty('--brand-navy', colors.navy);
  if (colors.light) root.style.setProperty('--brand-light', colors.light);
  if (colors.dark) root.style.setProperty('--brand-dark', colors.dark);
  if (colors.ink) root.style.setProperty('--ink', colors.ink);
  if (colors.inkMuted) root.style.setProperty('--ink-muted', colors.inkMuted);
  if (colors.inkFaint) root.style.setProperty('--ink-faint', colors.inkFaint);
  if (colors.gradientFrom)
    root.style.setProperty('--gradient-from', colors.gradientFrom);
  if (colors.gradientTo)
    root.style.setProperty('--gradient-to', colors.gradientTo);
  if (colors.whisper) root.style.setProperty('--whisper', colors.whisper);

  // Per-mode element tokens -> --tag-color-light, --heading-color-dark, etc.
  for (const mode of TOKEN_MODES) {
    const table = tokens[mode] ?? {};
    for (const key of TOKEN_KEYS) {
      const value = table[key];
      if (value === undefined || value === null || value === '') continue;
      const varName = `${cssVar(key)}-${mode}`;
      root.style.setProperty(varName, value);
    }
  }

  if (fonts.display) root.style.setProperty('--display-font', fonts.display);
  if (fonts.body) root.style.setProperty('--body-font', fonts.body);
}
