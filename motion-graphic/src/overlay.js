import { window01, smoothstep, clamp } from './util.js';
import { DURATION } from './timeline.js';

// Presentation layer: chapter captions, 3D-anchored labels, a live metrics panel
// and the closing card. Laid out on a 1920×1080 design grid scaled by --u.

const CHAPTERS = [
  {
    a: 0.9,
    b: 8.1,
    kicker: 'The metaphor',
    title: 'The Journey',
    text: 'A business moves forward, driven by key elements working together.',
  },
  {
    a: 8.6,
    b: 15.2,
    kicker: 'Phase 1',
    title: 'Stable Growth',
    text: 'The engine (effectiveness) powers the car forward, and the steering wheel (efficiency) keeps it on track.',
  },
  {
    a: 15.7,
    b: 22.7,
    kicker: 'Phase 2',
    title: 'Growing Challenges',
    text: 'The road (equity) starts to crack, making the journey less smooth.',
  },
  {
    a: 23.1,
    b: 30.0,
    kicker: 'Phase 3',
    title: 'Loss of Stability',
    text: 'The road collapses, and the car loses stability, even though the engine is still running.',
  },
];

const LABELS = [
  {
    id: 'engine',
    title: 'Effectiveness',
    sub: 'The engine',
    color: 'var(--c-eng)',
    dx: -230,
    dy: -150,
    show: [
      [2.2, 8.0],
      [9.4, 14.6],
      [25.8, 29.8],
    ],
    subAlt: { from: 25, text: 'Engine still running' },
  },
  {
    id: 'steering',
    title: 'Efficiency',
    sub: 'The steering wheel',
    color: 'var(--c-eff)',
    dx: 160,
    dy: -170,
    show: [
      [2.8, 8.0],
      [9.8, 14.6],
    ],
  },
  {
    id: 'road',
    title: 'Equity',
    sub: 'The road',
    color: 'var(--c-eq)',
    dx: 170,
    dy: 95,
    show: [
      [3.4, 8.0],
      [16.4, 22.2],
    ],
    subAlt: { from: 16, text: 'The road is cracking' },
  },
];

const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};

export function buildOverlay(stage, { captions = true } = {}) {
  const root = el('div', 'ov', stage);
  if (!captions) root.classList.add('no-captions');

  const scrim = el('div', 'scrim-top', root);
  const chapter = el('div', 'chapter', root);
  const kicker = el('div', 'kicker', chapter);
  const title = el('h1', '', chapter);
  const text = el('p', '', chapter);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'leaders');
  svg.setAttribute('viewBox', '0 0 1920 1080');
  svg.setAttribute('preserveAspectRatio', 'none');
  root.appendChild(svg);

  const labels = LABELS.map((L) => {
    const line = document.createElementNS(svgNS, 'polyline');
    line.setAttribute('class', 'leader');
    line.style.stroke = L.color;
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', '5');
    dot.style.fill = L.color;
    const ring = document.createElementNS(svgNS, 'circle');
    ring.setAttribute('class', 'ring');
    ring.style.stroke = L.color;
    svg.append(line, ring, dot);
    const box = el('div', 'label', root);
    box.style.setProperty('--c', L.color);
    el('div', 'l-title', box, L.title);
    const sub = el('div', 'l-sub', box, L.sub);
    return { L, line, dot, ring, box, sub };
  });

  // Metrics panel
  const hud = el('div', 'hud', root);
  const row = (cls, name, part) => {
    const r = el('div', `hud-row ${cls}`, hud);
    const head = el('div', 'hud-head', r);
    el('span', 'hud-name', head, `${name} <em>· ${part}</em>`);
    const val = el('span', 'hud-val', head);
    const bar = el('div', 'hud-bar', r);
    const fill = el('div', 'hud-fill', bar);
    return { val, fill, bar };
  };
  const hEng = row('eng', 'Effectiveness', 'Engine');
  const hEff = row('eff', 'Efficiency', 'Steering');
  const hEq = row('eq', 'Equity', 'Road integrity');
  hEff.bar.classList.add('center');

  // Closing card
  const fin = el('div', 'final', root);
  el('div', 'kicker', fin, 'Conclusion');
  el('h2', '', fin, 'Sustainable Success');
  const finP = el(
    'p',
    '',
    fin,
    "It's not just about the engine.<br>You need a strong foundation <b class='eq'>(equity)</b><br>and efficient direction <b class='eff'>(efficiency)</b> to keep moving forward."
  );
  const legend = el(
    'div',
    'legend',
    fin,
    "<span><i class='eng'></i>Effectiveness · engine</span><span><i class='eff'></i>Efficiency · steering</span><span><i class='eq'></i>Equity · road</span>"
  );
  const finScrim = el('div', 'scrim-left', root);
  root.insertBefore(finScrim, fin);

  const fade = el('div', 'fade', root);

  let lastChapter = -1;
  function update(t, st) {
    // Chapter captions
    let idx = -1;
    let op = 0;
    for (let i = 0; i < CHAPTERS.length; i++) {
      const c = CHAPTERS[i];
      const o = window01(t, c.a, c.b, 0.7, 0.6);
      if (o > 0) {
        idx = i;
        op = o;
      }
    }
    if (idx !== lastChapter && idx >= 0) {
      const c = CHAPTERS[idx];
      kicker.textContent = c.kicker;
      title.textContent = c.title;
      text.textContent = c.text;
      lastChapter = idx;
    }
    chapter.style.opacity = op.toFixed(3);
    chapter.style.transform = `translateY(calc(var(--u) * ${((1 - op) * 14).toFixed(2)}))`;
    scrim.style.opacity = (Math.max(op, window01(t, 0.5, 30.2, 1, 1)) * 0.9).toFixed(3);

    // Labels
    for (const lb of labels) {
      const { L } = lb;
      let o = 0;
      for (const [a, b] of L.show) o = Math.max(o, window01(t, a, b, 0.55, 0.45));
      const p = st.anchors[L.id];
      if (!p || !p.visible) o = 0;
      if (o <= 0.001) {
        lb.box.style.opacity = '0';
        lb.line.style.opacity = '0';
        lb.dot.style.opacity = '0';
        lb.ring.style.opacity = '0';
        continue;
      }
      if (L.subAlt) lb.sub.textContent = t >= L.subAlt.from ? L.subAlt.text : L.sub;
      const x = p.x;
      const y = p.y;
      const grow = smoothstep(0, 0.6, o);
      const lx = x + L.dx * grow;
      const ly = y + L.dy * grow;
      const elbowX = x + L.dx * 0.35 * grow;
      lb.line.setAttribute('points', `${x.toFixed(1)},${y.toFixed(1)} ${elbowX.toFixed(1)},${ly.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}`);
      lb.line.style.opacity = o.toFixed(3);
      lb.dot.setAttribute('cx', x.toFixed(1));
      lb.dot.setAttribute('cy', y.toFixed(1));
      lb.dot.style.opacity = o.toFixed(3);
      const pulse = (t * 0.9) % 1;
      lb.ring.setAttribute('cx', x.toFixed(1));
      lb.ring.setAttribute('cy', y.toFixed(1));
      lb.ring.setAttribute('r', (6 + pulse * 16).toFixed(1));
      lb.ring.style.opacity = (o * (1 - pulse) * 0.8).toFixed(3);
      const left = L.dx < 0;
      lb.box.style.left = `calc(var(--u) * ${lx.toFixed(1)})`;
      lb.box.style.top = `calc(var(--u) * ${ly.toFixed(1)})`;
      lb.box.style.transform = `translate(${left ? '-100%' : '0'}, -50%) translateX(calc(var(--u) * ${left ? -10 : 10}))`;
      lb.box.style.opacity = smoothstep(0.35, 1, o).toFixed(3);
    }

    // Metrics
    const ho = window01(t, 8.4, 29.9, 0.8, 0.8);
    hud.style.opacity = ho.toFixed(3);
    if (ho > 0) {
      hEng.val.textContent = `${Math.round(st.rpm).toLocaleString('en-US')} rpm · running`;
      hEng.fill.style.width = `${clamp(st.rpm / 4000) * 100}%`;
      const deg = Math.round(st.wheelDeg);
      hEff.val.textContent = `${Math.abs(deg)}° ${deg > 1 ? 'left' : deg < -1 ? 'right' : 'centre'}`;
      const f = clamp(st.wheelDeg / 180, -1, 1);
      hEff.fill.style.left = `${50 + Math.min(0, f) * 50}%`;
      hEff.fill.style.width = `${Math.abs(f) * 50}%`;
      const integ = Math.round(st.integrity * 100);
      hEq.val.textContent = `${integ}%`;
      hEq.fill.style.width = `${st.integrity * 100}%`;
      hEq.fill.style.background = st.integrity > 0.6 ? 'var(--c-eq)' : st.integrity > 0.3 ? '#f08a3c' : '#e5484d';
    }

    // Closing card
    const fo = smoothstep(30.3, 31.6, t);
    finScrim.style.opacity = fo.toFixed(3);
    fin.style.opacity = fo.toFixed(3);
    fin.style.transform = `translateY(calc(var(--u) * ${((1 - fo) * 18).toFixed(2)}))`;
    finP.style.opacity = smoothstep(31.0, 32.2, t).toFixed(3);
    legend.style.opacity = smoothstep(31.8, 33.0, t).toFixed(3);

    // Fade in / out
    fade.style.opacity = Math.max(1 - smoothstep(0.0, 1.3, t), smoothstep(DURATION - 0.9, DURATION, t)).toFixed(3);
  }

  return { update };
}
