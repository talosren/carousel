// ---------------------------------------------------------------------------
// Slide content — this is the file you edit.
//
// Each object below becomes one Instagram-ready 4:5 slide. Add, remove, or
// reorder entries and the progress bar, dots, and swipe arrow all recompute.
//
// Shape (all fields optional unless noted):
//   type       required  'hero' | 'problem' | 'solution' | 'features'
//                        | 'details' | 'howto' | 'quote' | 'cta'
//   theme      required  'light' | 'dark' | 'brand' (brand = gradient)
//   tag                  small uppercase label above heading
//   heading              the big display line
//   body                 supporting paragraph under the heading
//   pills                array of strings (problem slide — strikethrough)
//   tags                 array of strings (details slide — neutral pills)
//   items                feature rows: [{ icon, label, description }]
//   steps                howto rows: [{ title, description }]
//   swatches             details slide: array of CSS color strings
//   quote                solution slide: { label, text }
//   text / attribution   quote slide: string + { name, role }
//   cta                  cta slide: { text, href }
//   watermark            hero slide: false to disable
// ---------------------------------------------------------------------------

export const slides = [
  {
    type: 'hero',
    theme: 'light',
    tag: 'INTRODUCING',
    heading: 'A workspace that thinks with you.',
    body: 'One home for notes, docs, and projects — quietly organized, deeply yours.',
    watermark: true,
  },

  {
    type: 'problem',
    theme: 'dark',
    tag: 'THE PROBLEM',
    heading: 'Your tools are fighting each other.',
    body: 'Context lives in five tabs. Decisions go missing. Work fragments.',
    pills: ['Google Docs', 'Evernote', 'Trello', 'Confluence', 'Random PDFs'],
  },

  {
    type: 'solution',
    theme: 'brand',
    tag: 'THE ANSWER',
    heading: 'One surface. Every shape.',
    body: 'Notes, docs, wikis, and databases — composable on a single page.',
    quote: {
      label: 'Ask Notion AI',
      text: 'Summarize last week\u2019s engineering decisions for leadership.',
    },
  },

  {
    type: 'features',
    theme: 'light',
    tag: 'WHAT YOU GET',
    heading: 'Built for how you actually work.',
    items: [
      {
        icon: '◇',
        label: 'Docs that flow',
        description: 'Rich text, collaborative cursors, zero lock-in.',
      },
      {
        icon: '◎',
        label: 'Databases for humans',
        description: 'Query like a spreadsheet, arrange like a mood board.',
      },
      {
        icon: '◈',
        label: 'AI where you write',
        description: 'Summarize, draft, translate — inside the page.',
      },
      {
        icon: '○',
        label: 'One source of truth',
        description: 'Teams, projects, specs, and launches in one place.',
      },
    ],
  },

  {
    type: 'details',
    theme: 'dark',
    tag: 'MAKE IT YOURS',
    heading: 'Every page, your palette.',
    body: 'Tweak colors, typography, icons, and layout — no CSS required.',
    swatches: ['#f6f5f4', '#0075de', '#213183', '#dd5b00', '#1aae39'],
    tags: ['Roadmaps', 'OKRs', 'Specs', 'Notes', 'Wikis', 'CRMs'],
  },

  {
    type: 'howto',
    theme: 'light',
    tag: 'GET STARTED',
    heading: 'Three steps. One afternoon.',
    steps: [
      {
        title: 'Create a workspace',
        description: 'Free forever for personal use. No credit card.',
      },
      {
        title: 'Import what you have',
        description: 'Evernote, Google Docs, Apple Notes, Markdown.',
      },
      {
        title: 'Invite your team',
        description: 'Roles, permissions, and guest access baked in.',
      },
    ],
  },

  {
    type: 'cta',
    theme: 'brand',
    tag: 'START FREE',
    heading: 'Build your best thinking.',
    body: 'Join 100M+ people using Notion to organize their work and life.',
    cta: { text: 'Try Notion Free \u2192', href: 'https://notion.so' },
  },
];
