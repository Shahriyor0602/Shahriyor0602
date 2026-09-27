import { gsap } from 'gsap';
import { el, splitWords, revealWords, reveal, conceal, svg, sv } from '../engine/text.js';
import { INN_LANTERNS } from '../engine/shapes.js';

// Scene 4 — Q3: Conscious business.  ★ Signature 3 (the Caravanserai Test).
const AMBER = '#e8a33d';
const SAND = '#d9c7a3';
const TERRA = '#b5563a';

export default {
  id: 'conscious',
  create({ stage, stageEl, field, content }) {
    const SC = content.scenes[4];
    const C = SC.steps;
    const root = el(stageEl, 'scene');
    const kicker = el(root, 'caption', SC.kicker, { left: '128px', top: '92px' });
    const art = svg(root);
    const ambient = [];

    // ---- Step 0: definition; mission & impact glow -----------------------------
    const def = el(root, 'display', '', { left: '128px', top: '300px', fontSize: '80px', lineHeight: '1.16' });
    const defW = C[0].lines.map((ln) => splitWords(el(def, 'line', ln)));
    const glow = C[0].glow.map((g, i) =>
      el(root, 'caption', g, { left: '1340px', top: `${330 + i * 93}px`, fontSize: '30px', color: 'var(--amber)' }),
    );
    const ticks = [0, 1].map((i) => sv(art, 'line', { x1: 1170, y1: 348 + i * 93, x2: 1310, y2: 348 + i * 93, stroke: AMBER, 'stroke-width': 1.5, opacity: 0 }));

    // ---- Step 1: SK double bottom line -----------------------------------------
    const B = C[1].bars;
    const base = 800;
    const k = 12.4; // px per trillion won
    const net = 32.2;
    const env = 3.1;
    const gross = net + env; // drawn to scale, deliberately unlabelled (not a reported figure)
    const bar = (x, y, h, fill, stroke) => sv(art, 'rect', { x, y, width: 190, height: h, fill, stroke, 'stroke-width': 1.5 });
    const gTop = base - gross * k;
    const bGross = bar(900, gTop, gross * k, 'rgba(217,199,163,0.16)', SAND);
    const bEnv = bar(1170, gTop, env * k, 'rgba(181,86,58,0.55)', TERRA);
    const bNet = bar(1440, base - net * k, net * k, 'rgba(232,163,61,0.28)', AMBER);
    const joins = [
      sv(art, 'line', { x1: 1090, y1: gTop, x2: 1170, y2: gTop, stroke: SAND, 'stroke-dasharray': '4 6', opacity: 0 }),
      sv(art, 'line', { x1: 1360, y1: gTop + env * k, x2: 1440, y2: gTop + env * k, stroke: SAND, 'stroke-dasharray': '4 6', opacity: 0 }),
    ];
    const axis = sv(art, 'line', { x1: 870, y1: base, x2: 1670, y2: base, stroke: SAND, 'stroke-width': 1.5, opacity: 0 });
    const skCap = el(root, 'caption', C[1].label, { left: '128px', top: '250px' });
    const skLine = el(root, 'display', '', { left: '128px', top: '330px', width: '680px', fontSize: '60px', lineHeight: '1.12' });
    const skW = splitWords(skLine, [C[1].line]);
    const labGross = el(root, 'body', B.gross.label, { left: '880px', top: `${base + 18}px`, width: '230px', textAlign: 'center', fontSize: '24px' });
    const labEnv = el(root, 'body', B.env.label, { left: '1150px', top: `${base + 18}px`, width: '230px', textAlign: 'center', fontSize: '24px' });
    const labNet = el(root, 'body', B.net.label, { left: '1420px', top: `${base + 18}px`, width: '230px', textAlign: 'center', fontSize: '24px' });
    const valEnv = el(root, 'lead harm', `${B.env.value} ${B.env.unit}`, { left: '1150px', top: `${gTop - 70}px`, width: '230px', textAlign: 'center', fontSize: '40px' });
    const valNet = el(root, 'lead amber', `${B.net.value} ${B.net.unit}`, { left: '1420px', top: `${base - net * k - 70}px`, width: '230px', textAlign: 'center', fontSize: '40px' });

    // ---- Step 2: TOMS flip -----------------------------------------------------
    const flip = el(root, 'flip', '', { left: '560px', top: '250px', width: '800px', height: '400px' });
    const inner = el(flip, 'flip-inner');
    const front = el(inner, 'face');
    el(front, 'caption', C[2].brand, { position: 'relative' });
    el(front, 'display', C[2].front.title, { position: 'relative', fontSize: '96px' });
    el(front, 'body', C[2].front.text, { position: 'relative' });
    const back = el(inner, 'face back');
    el(back, 'caption amber', `${C[2].brand} · ${C[2].back.when}`, { position: 'relative' });
    el(back, 'display', C[2].back.title, { position: 'relative', fontSize: '58px', color: 'var(--amber-soft)' });
    el(back, 'body', C[2].back.text, { position: 'relative', color: 'var(--ink)' });
    const tomsLine = el(root, 'display center', '', { top: '750px', fontSize: '62px' });
    const tomsW = splitWords(tomsLine, [C[2].line]);

    // ---- Steps 3–6: the Caravanserai Test ---------------------------------------
    const testTitle = el(root, 'caption amber', C[3].title, { left: '128px', top: '200px' });
    const qs = [3, 4, 5, 6].map((s, i) => {
      const box = el(root, '', '', { left: '128px', top: `${280 + i * 140}px`, width: '720px' });
      el(box, 'caption', `${i + 1} · ${C[s].question.dim}`, { position: 'relative', fontSize: '24px', color: 'var(--amber)' });
      el(box, 'lead', C[s].question.q, { position: 'relative', marginTop: '8px', fontSize: '40px', whiteSpace: 'nowrap' });
      return box;
    });
    // Lanterns: a hook, a small lantern body, and a soft glow.
    const lanterns = INN_LANTERNS.map(([x, y]) => {
      const g = sv(art, 'g', { opacity: 0 });
      const halo = sv(g, 'circle', { cx: x, cy: y + 14, r: 70, fill: 'url(#lanternGlow)', opacity: 0 });
      sv(g, 'line', { x1: x, y1: 604, x2: x, y2: y - 16, stroke: SAND, 'stroke-width': 1.5 });
      const body = sv(g, 'path', {
        d: `M ${x - 11} ${y - 12} L ${x + 11} ${y - 12} L ${x + 14} ${y + 16} L ${x + 7} ${y + 30} L ${x - 7} ${y + 30} L ${x - 14} ${y + 16} Z`,
        fill: 'rgba(40,34,30,0.9)', stroke: SAND, 'stroke-width': 1.5,
      });
      const flame = sv(g, 'ellipse', { cx: x, cy: y + 10, rx: 6, ry: 10, fill: AMBER, opacity: 0 });
      ambient.push(gsap.to(halo, { attr: { r: 78 }, duration: 0.9 + Math.random() * 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      g.dataset.ambient = '';
      return { g, halo, body, flame };
    });
    const defs = sv(art, 'defs');
    const rg = sv(defs, 'radialGradient', { id: 'lanternGlow' });
    sv(rg, 'stop', { offset: '0', 'stop-color': '#ffcf7a', 'stop-opacity': '0.9' });
    sv(rg, 'stop', { offset: '0.35', 'stop-color': AMBER, 'stop-opacity': '0.35' });
    sv(rg, 'stop', { offset: '1', 'stop-color': AMBER, 'stop-opacity': '0' });

    // ---- Timeline ---------------------------------------------------------------
    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    tl.set(fs, { s: field.at('uzbekLit'), opacity: 0.1, turb: 0.06, size: 2.1, scale: 1, x: 0, y: 0, z: 0 }, 0);
    tl.set(stage.rig, { x: 0, y: 0, z: 10, lookX: 0, lookY: 0 }, 0);
    tl.set([bGross, bEnv, bNet], { opacity: 0 }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — definition.
    let t = tl.duration();
    tl.to(fs, { opacity: 0, duration: 1.2 }, t);
    reveal(tl, kicker, t, { duration: 1, y: 10 });
    defW.forEach((w, i) => revealWords(tl, w, t + 0.4 + i * 1.1, { stagger: 0.07 }));
    [0, 1].forEach((i) => {
      tl.fromTo(ticks[i], { opacity: 0, attr: { x2: 1170 } }, { opacity: 0.7, attr: { x2: 1310 }, duration: 0.9, ease: 'power2.out' }, t + 3.8 + i * 0.5);
      tl.fromTo(glow[i], { opacity: 0, textShadow: '0 0 0px rgba(232,163,61,0)' }, { opacity: 1, textShadow: '0 0 24px rgba(232,163,61,0.85)', duration: 1.2 }, t + 4.1 + i * 0.5);
    });
    tl.addLabel('s0');

    // Step 1 — SK: value rises, the published damage is subtracted, net settles.
    t = tl.duration();
    conceal(tl, [def, ...glow], t, { duration: 0.6 });
    tl.to(ticks, { opacity: 0, duration: 0.5 }, t);
    reveal(tl, skCap, t + 0.5, { duration: 0.9, y: 10 });
    tl.fromTo(axis, { opacity: 0 }, { opacity: 0.6, duration: 0.8 }, t + 0.6);
    tl.set(bGross, { opacity: 1 }, t + 0.8);
    tl.fromTo(bGross, { attr: { y: base, height: 0 } }, { attr: { y: gTop, height: gross * k }, duration: 1.8, ease: 'power3.out' }, t + 0.8);
    reveal(tl, labGross, t + 1.4, { duration: 0.9, y: 8 });
    tl.fromTo(joins[0], { opacity: 0 }, { opacity: 0.7, duration: 0.6 }, t + 2.6);
    tl.set(bEnv, { opacity: 1 }, t + 2.9);
    tl.fromTo(bEnv, { attr: { height: 0 } }, { attr: { height: env * k }, duration: 1.4, ease: 'power2.inOut' }, t + 2.9);
    reveal(tl, valEnv, t + 3.3, { duration: 1.1, y: 10 });
    reveal(tl, labEnv, t + 3.4, { duration: 0.9, y: 8 });
    tl.fromTo(joins[1], { opacity: 0 }, { opacity: 0.7, duration: 0.6 }, t + 4.3);
    tl.set(bNet, { opacity: 1 }, t + 4.5);
    tl.fromTo(bNet, { attr: { y: base, height: 0 } }, { attr: { y: base - net * k, height: net * k }, duration: 1.8, ease: 'power3.out' }, t + 4.5);
    reveal(tl, valNet, t + 5.4, { duration: 1.1, y: 10 });
    reveal(tl, labNet, t + 5.5, { duration: 0.9, y: 8 });
    revealWords(tl, skW, t + 6.4, { stagger: 0.07 });
    tl.addLabel('s1');

    // Step 2 — TOMS revises its own good idea: the card turns over.
    t = tl.duration();
    conceal(tl, [skCap, skLine, labGross, labEnv, labNet, valEnv, valNet], t, { duration: 0.6 });
    tl.to([bGross, bEnv, bNet, axis, ...joins], { opacity: 0, duration: 0.6 }, t);
    reveal(tl, flip, t + 0.6, { duration: 1.2 });
    tl.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 1.6, ease: 'power3.inOut' }, t + 3.2);
    revealWords(tl, tomsW, t + 5.0, { stagger: 0.07 });
    tl.addLabel('s2');

    // Step 3 — ★ the inn returns; the first lantern lights.
    const light = (i, at) => {
      const L = lanterns[i];
      tl.fromTo(L.halo, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'sine.inOut' }, at);
      tl.fromTo(L.flame, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, at);
      tl.to(L.body, { attr: { fill: 'rgba(232,163,61,0.5)' }, duration: 1 }, at);
    };
    t = tl.duration();
    conceal(tl, [flip, tomsLine, kicker], t, { duration: 0.7 });
    tl.to(fs, { s: field.at('inn'), duration: 4.2, ease: 'sine.inOut' }, t + 0.3);
    tl.to(fs, { opacity: 1, turb: 1.1, size: 2.2, duration: 2.5, ease: 'sine.inOut' }, t + 0.3);
    lanterns.forEach((L, i) => tl.fromTo(L.g, { opacity: 0 }, { opacity: 1, duration: 1.2 }, t + 3.4 + i * 0.15));
    reveal(tl, testTitle, t + 3.0, { duration: 1, y: 10 });
    reveal(tl, qs[0], t + 4.4, { duration: 1.2 });
    light(0, t + 4.6);
    tl.addLabel('s3');

    // Steps 4–6 — one lantern, one question, per press.
    for (let i = 1; i < 4; i++) {
      t = tl.duration();
      tl.to(qs[i - 1], { opacity: 0.45, duration: 0.8 }, t);
      reveal(tl, qs[i], t + 0.2, { duration: 1.2 });
      light(i, t + 0.4);
      if (i === 3) tl.to(qs, { opacity: 1, duration: 1.2 }, t + 2.4);
      tl.addLabel(`s${3 + i}`);
    }

    return {
      tl,
      steps: C.length,
      leave() {
        return gsap.timeline().to(root, { opacity: 0, duration: 0.8, ease: 'power2.in' });
      },
      dispose() {
        ambient.forEach((a) => a.kill());
        root.remove();
      },
    };
  },
};
