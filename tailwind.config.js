/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,html}'],
  // These selectors are built dynamically (`slide--${slide.theme}`) so the
  // content scanner can't see them as literal classes. Without them, Tailwind
  // strips the `.slide--light/dark/brand` alias rules in src/styles.css that
  // map mode-specific CSS vars (e.g. --heading-color-light) onto the unified
  // --heading-color the slide elements actually consume, breaking theme-level
  // color updates. Safelisting keeps those rules in the compiled bundle.
  safelist: ['slide--light', 'slide--dark', 'slide--brand'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0075de',
          primaryDark: '#005bab',
          navy: '#213183',
          light: '#f6f5f4',
          dark: '#31302e',
        },
        warm: {
          white: '#f6f5f4',
          dark: '#31302e',
          500: '#615d59',
          300: '#a39e98',
        },
        ink: {
          DEFAULT: 'rgba(0,0,0,0.95)',
          muted: '#615d59',
          faint: '#a39e98',
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      letterSpacing: {
        displayTightest: '-0.042em',
        displayTight: '-0.034em',
        sectionTight: '-0.031em',
      },
      boxShadow: {
        whisper: '0 1px 3px rgba(0,0,0,0.04), 0 2px 7px rgba(0,0,0,0.03), 0 7px 15px rgba(0,0,0,0.02), 0 14px 28px rgba(0,0,0,0.04)',
        card: '0 4px 18px rgba(0,0,0,0.04), 0 2.025px 7.84688px rgba(0,0,0,0.027), 0 0.8px 2.925px rgba(0,0,0,0.02), 0 0.175px 1.04062px rgba(0,0,0,0.01)',
      },
      borderColor: {
        whisper: 'rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
