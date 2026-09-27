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
  {
    id: 'title',
    name: 'Title / thesis',
    start: 35,
    end: 50,
    steps: [
      {
        t: 5,
        places: { east: 'China', west: 'Persia' },
        note: 'On the Silk Road, from China to Persia, every caravan stopped at the same kind of place: the caravanserai. Every traveler got the same shelter, water and protection — and that is why they came back.',
      },
      {
        t: 4,
        kicker: 'Team A-7 “Caravanserai”',
        title: 'What Does Great Management Mean?',
        subtitle: 'Lessons from the Caravanserai',
        note: 'We are Team A-7, Caravanserai. Our question: what does great management mean?',
      },
      {
        t: 6,
        thesis: ['Do the right things.', 'Do them right.', 'Do them fairly —'],
        thesisTail: 'for everyone who travels with the firm.',
        note: 'Our answer in one line: great management means doing the right things, doing them right, and doing them fairly for everyone who travels with the firm.',
      },
    ],
  },
  {
    id: 'purpose',
    name: 'Q1 — Purpose',
    start: 50,
    end: 110,
    kicker: 'Q1 · What is the ultimate purpose of a corporation?',
    steps: [
      {
        t: 12,
        then: { year: '1970', who: 'Milton Friedman', quote: '“The social responsibility of business is to increase its profits.”' },
        now: { year: '2019', who: 'Business Roundtable', number: '181', text: 'CEOs commit to all stakeholders' },
        note: 'For most of the last century the answer was Friedman’s, in 1970: the social responsibility of business is to increase its profits. In August 2019, 181 CEOs of the Business Roundtable signed a statement committing their firms to customers, employees, suppliers, communities and shareholders together.',
      },
      {
        t: 13,
        rings: ['Nature', 'Society', 'Economy'],
        claim: 'The firm is an open system.',
        harm: 'A subsystem that consumes its host.',
        note: 'Why we side with the stakeholder view: the firm is an open system. The economy sits inside society, which sits inside nature. A subsystem that maximizes itself by degrading its host is not maximizing anything — it is consuming its own foundation.',
      },
      {
        t: 10,
        answer: ['Common good is the purpose.', 'Profit is the condition.'],
        breath: 'You can’t live without breathing. You don’t live for it.',
        note: 'Our answer: the purpose of a corporation is the common good. Profit is the necessary condition — and the evidence that the value is real. Profit is to a company what breathing is to a person.',
      },
      {
        t: 10,
        axisTitle: 'Profit and social value, over time',
        horizons: ['Quarters', 'Years', 'Decades'],
        states: ['Often contradictory', 'Mixed', 'Complementary'],
        after: 'Responsible management is managing that tension.',
        note: 'But we won’t pretend it is always comfortable. In quarters, social investment is a cost and cutting corners raises margins. Over years it is mixed. Over decades they are complementary — no firm outlives its society.',
      },
      {
        t: 15,
        unilever: { label: 'Unilever · 2018', value: 69, suffix: '%', text: 'faster growth for its Sustainable Living Brands' },
        danone: {
          label: 'Danone',
          before: { when: 'June 2020', text: '>99% of shareholders approve mission status' },
          gap: '9 months later',
          after: { when: 'March 2021', text: 'CEO removed' },
        },
        line: 'Shared value isn’t automatic. It has to be engineered.',
        note: 'The evidence cuts both ways. Unilever’s Sustainable Living Brands grew 69% faster than the rest of the business in 2018. But Danone: over 99% of shareholders approved its mission status in June 2020 — and nine months later the board removed its CEO. Shared value isn’t automatic. It has to be engineered.',
      },
    ],
  },
  { id: 'equity', name: 'Q2 — Equity', start: 110, end: 190, steps: [] },
  { id: 'conscious', name: 'Q3 — Conscious business', start: 190, end: 250, steps: [] },
  { id: 'close', name: 'Our fields + close', start: 250, end: 280, steps: [] },
  // Decisions (team, 2026-09-27):
  // - Scene 3: Costco beat cut for time; the Aral Sea stays.
  // - Scene 4 SK chart: only reported figures are labelled (−3.1tn environmental,
  //   32.2tn net). The gross bar is drawn to scale but carries no number.
  // - Scene 5: member majors/lenses stay as report placeholders until supplied.
];
