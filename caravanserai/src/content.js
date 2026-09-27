// Every word that appears on screen lives in this file.
// Edit wording here; animation code never hard-codes copy.
// Every figure is taken from report.pdf (Team A-7, Group Assignment 1).

export const meta = {
  title: 'What Does Great Management Mean?',
  subtitle: 'Lessons from the Caravanserai',
  team: 'Team A-7 “Caravanserai”',
  course: 'Responsible Management · Kyung Hee University · Prof. Stephen Yong-Seung Park',
  targetTotal: 280, // 4:40
  hardLimit: 300, // 5:00
};

// Timing plan: `start`/`end` are the scene's target window in seconds;
// each step's `t` is its target duration (steps of a scene sum to end - start).
// `note` is the speaker line; it shows in the presenter overlay (P) and
// becomes the PPTX speaker notes at export.
export const scenes = [
  {
    id: 'cold-open',
    name: 'Cold open — Ship of Miracles',
    start: 0,
    end: 35,
    steps: [
      {
        t: 8,
        caption: 'Hungnam. December 1950.',
        note: 'December 1950. A cargo ship, the Meredith Victory, lies in the port of Hungnam as Chinese forces close in.',
      },
      {
        t: 10,
        lead: 'Designed for 12 passengers.',
        counter: { from: 12, to: 14000, suffix: '+' },
        counterLabel: 'Korean civilians aboard',
        note: 'She was designed for a crew of 35 and twelve passengers. Captain Leonard LaRue loaded refugees instead — more than 14,000 Korean civilians.',
      },
      {
        t: 7,
        lines: ['Zero lives lost.', 'Five babies born.'],
        note: 'She reached Pusan on Christmas Eve. Five babies were born on the way, and not a single life was lost.',
      },
      {
        t: 10,
        headline: ['By cargo efficiency, indefensible.', 'By purpose, the only choice.'],
        question: 'Who are we serving?',
        note: 'Measured by cargo efficiency, LaRue’s decision was indefensible. Measured by purpose, it was the only decision available. Every business faces the same test: who are we serving?',
      },
    ],
  },
  { id: 'title', name: 'Title / thesis', start: 35, end: 50, steps: [] },
  { id: 'purpose', name: 'Q1 — Purpose', start: 50, end: 110, steps: [] },
  { id: 'equity', name: 'Q2 — Equity', start: 110, end: 190, steps: [] },
  { id: 'conscious', name: 'Q3 — Conscious business', start: 190, end: 250, steps: [] },
  { id: 'close', name: 'Our fields + close', start: 250, end: 280, steps: [] },
];
