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
  {
    id: 'equity',
    name: 'Q2 — Equity',
    start: 110,
    end: 190,
    kicker: 'Q2 · Effectiveness, efficiency, or equity?',
    steps: [
      {
        t: 7,
        values: [
          { word: 'Effectiveness', plain: 'doing the right things' },
          { word: 'Efficiency', plain: 'doing things right' },
          { word: 'Equity', plain: 'doing things fairly' },
        ],
        pick: 'Our answer: equity',
        note: 'Prof. Park gives three values of management: effectiveness, doing the right things; efficiency, doing things right; equity, doing things fairly. We chose equity.',
      },
      {
        t: 10,
        car: ['Efficiency is the engine.', 'Effectiveness is the steering.', 'Equity is the road.'],
        note: 'Our metaphor: efficiency is the engine. Effectiveness is the steering wheel. Equity is the road.',
      },
      {
        t: 5,
        crash: 'A fast car with good steering still crashes if there is no road beneath it.',
        note: 'A fast car with excellent steering still crashes if there is no road beneath it.',
      },
      {
        t: 5,
        card: { name: 'Volkswagen', year: '2015', stat: '11M', statNote: 'up to 11 million vehicles affected', more: 'costs passed US$30 billion by 2017' },
        note: 'Volkswagen, 2015: software that cheated emissions tests. Up to 11 million vehicles; costs passed thirty billion dollars by 2017.',
      },
      {
        t: 5,
        card: { name: 'Wells Fargo', year: '2016', stat: '$3B', statNote: 'settlement with the DOJ and SEC, 2020', more: 'unauthorized accounts opened to hit sales targets' },
        note: 'Wells Fargo: cross-selling targets so aggressive that staff opened unauthorized accounts. A three-billion-dollar settlement.',
      },
      {
        t: 7,
        card: { name: 'Boeing 737 MAX', year: '2018–19', stat: '346', statNote: 'lives lost in two crashes', more: 'speed and cost pursued over pilots, passengers and engineers' },
        line: 'Not failures of efficiency. Failures of fairness.',
        note: 'Boeing 737 MAX: 346 lives lost in two crashes. None of these were failures of efficiency. They were failures of fairness.',
      },
      {
        t: 8,
        region: 'Uzbek cotton',
        stat: '331',
        statNote: 'global brands and retailers refused to buy it',
        why: 'State-organized forced labour kept the harvest “efficient.”',
        note: 'Our own region. For decades Uzbekistan’s cotton harvest relied on state-organized forced labour. Labour was nearly free — so 331 global brands and retailers signed a pledge and refused to buy Uzbek cotton at all.',
      },
      {
        t: 10,
        lift: [
          { when: '2021 harvest', text: 'ILO monitoring: systemic forced and child labour eradicated' },
          { when: '10 March 2022', text: 'Boycott ends' },
        ],
        line: 'Equity wasn’t the cost. It was the market access.',
        note: 'After years of reform, ILO monitoring of the 2021 harvest found systemic forced and child labour eradicated, and in March 2022 the boycott ended. Equity wasn’t the cost. It was the market access.',
      },
      {
        t: 10,
        sea: 'Aral Sea',
        then: { year: '1960', value: '68,000 km²' },
        now: { year: '2007', value: '~10%', text: 'of its original size' },
        line: 'Equity includes those not yet born.',
        note: 'The Aral Sea: 68,000 square kilometres in 1960, drained for cotton, down to about ten percent of its size by 2007. Equity includes those not yet born.',
      },
      {
        t: 13,
        tag: 'Where we disagreed',
        lines: ['Effectiveness sets the destination.', 'Equity decides whether anyone travels with you.'],
        note: 'Not all of us started from equity. Some argued effectiveness comes first — fairness without a mission goes nowhere. It changed how we say it: effectiveness sets the destination; equity decides whether anyone will travel with you.',
      },
    ],
  },
  {
    id: 'conscious',
    name: 'Q3 — Conscious business',
    start: 190,
    end: 250,
    kicker: 'Q3 · What is the meaning of conscious business?',
    steps: [
      {
        t: 9,
        lines: ['Knows why it exists.', 'Sees what it leaves behind.', 'Acts on both.'],
        glow: ['Mission', 'Impact'],
        note: 'Our definition: a conscious business knows why it exists, sees the full consequences of what it does — and acts on both. Prof. Park calls these two awarenesses mission and impact.',
      },
      {
        t: 12,
        label: 'SK Group · Double Bottom Line · 2025',
        bars: {
          gross: { label: 'Social value created' },
          env: { value: '−3.1', unit: 'tn won', label: 'Environmental impact' },
          net: { value: '32.2', unit: 'tn won', label: 'Net social value' },
        },
        line: 'Publishing your own damage — that’s accounting, not advertising.',
        note: 'SK measures the social value its affiliates create, in won, every year. For 2025: 32.2 trillion won — and that is a net figure. SK reports its environmental impact as minus 3.1 trillion won and subtracts it. Publishing your own damage is accounting, not advertising.',
      },
      {
        t: 12,
        brand: 'TOMS',
        front: { title: 'One for One', text: 'a pair donated for every pair sold' },
        back: { when: '2021', title: 'At least one third of net profits', text: 'to grassroots organizations chosen with local partners' },
        line: 'Conscious means revising your own good idea.',
        note: 'TOMS built its brand on One for One. But donated shoes risked undercutting the local economies they meant to help. In 2021 TOMS retired the model and committed at least a third of net profits to grassroots organizations chosen with local partners. Conscious means revising your own good idea.',
      },
      {
        t: 8,
        title: 'The Caravanserai Test',
        question: { q: 'Why do we keep the inn?', dim: 'Purpose' },
        note: 'So we propose a test, named for our team. Four questions. One: why do we keep the inn — does the firm know why it exists, beyond making money?',
      },
      {
        t: 6,
        question: { q: 'Who is staying at our inn tonight?', dim: 'Stakeholders' },
        note: 'Two: who is staying at our inn tonight — every stakeholder, including nature and future generations?',
      },
      {
        t: 6,
        question: { q: 'What do we leave on the road behind us?', dim: 'Impact' },
        note: 'Three: what do we leave on the road behind us — do we know, publish and own our externalities?',
      },
      {
        t: 7,
        question: { q: 'Would every traveler call it fair?', dim: 'Equity' },
        note: 'Four: would every traveler call it fair? A firm that can answer all four honestly is conscious. One that avoids any of them is not.',
      },
    ],
  },
  {
    id: 'close',
    name: 'Our fields + close',
    start: 250,
    end: 280,
    steps: [
      {
        t: 10,
        tag: 'Responsible management, in our fields',
        // PLACEHOLDERS: fill `major` and `lens` for each member (report §5).
        // Any entry with placeholder: true renders with a dashed outline so it
        // cannot slip into the final talk unnoticed.
        members: [
          { name: 'Shakhriyor', major: 'Finance', lens: 'Social and environmental failures are future cash outflows — and a higher discount rate.' },
          { name: 'Mirsaid', major: '[major]', lens: '[one-line lens]', placeholder: true },
          { name: 'Mukaddas', major: 'Finance', lens: 'Capital allocation is never neutral: it decides which business models survive.' },
          { name: 'Janat', major: '[major]', lens: '[one-line lens]', placeholder: true },
          { name: 'Sogdiana', major: '[major]', lens: '[one-line lens]', placeholder: true },
          { name: 'Buyandari', major: '[major]', lens: '[one-line lens]', placeholder: true },
          { name: 'Nurmukhamed', major: '[major]', lens: '[one-line lens]', placeholder: true },
        ],
        note: 'Each of us read the paradigm through our own field. In finance: social and environmental failures are future cash outflows and a higher discount rate; and capital allocation is never neutral. [Other members: one line each.]',
      },
      {
        t: 13,
        close: ['Responsible management is not charity bolted onto business.', 'It is a business that has remembered why it exists.'],
        note: 'We began with Captain LaRue, who settled first whom he was serving. The caravanserais of the Silk Road stood for centuries because every traveler was treated fairly — and came back. Responsible management is not charity bolted onto business. It is a business that has remembered why it exists.',
      },
      {
        t: 7,
        thanks: 'Thank you',
        team: 'Team A-7 “Caravanserai”',
        note: 'Thank you.',
      },
    ],
  },
  // Decisions (team, 2026-09-27):
  // - Scene 3: Costco beat cut for time; the Aral Sea stays.
  // - Scene 4 SK chart: only reported figures are labelled (−3.1tn environmental,
  //   32.2tn net). The gross bar is drawn to scale but carries no number.
  // - Scene 5: member majors/lenses stay as report placeholders until supplied.
];
