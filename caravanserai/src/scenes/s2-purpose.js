import { gsap } from 'gsap';
import { el, splitWords, revealWords, reveal, conceal, svg, sv, draw } from '../engine/text.js';

// Scene 2 — Q1: Purpose.
const AMBER = '#e8a33d';
const SAND = '#d9c7a3';
const TERRA = '#b5563a';

export default {
  id: 'purpose',
  create({ stage, stageEl, field, content }) {
    const SC = content.scenes[2];
    const C = SC.steps;
    const root = el(stageEl, 'scene');
    const kicker = el(root, 'caption', SC.kicker, { left: '128px', top: '92px' });
    const art = svg(root);
    const ambient = [];

    // ---- Step 0: 1970 → 2019, the line bends ------------------------------
    const D0 = 'M 240 640 L 900 640 Q 1300 640 1640 640';
    const D1 = 'M 240 640 L 900 640 Q 1300 640 1640 420';
    const tline = sv(art, 'path', { d: D0, fill: 'none', stroke: SAND, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.8 });
    const n70 = sv(art, 'circle', { cx: 480, cy: 640, r: 10, fill: SAND });
    const n19 = sv(art, 'circle', { cx: 1640, cy: 640, r: 12, fill: AMBER });
    const thenCap = el(root, 'caption', `${C[0].then.year} · ${C[0].then.who}`, { left: '240px', top: '420px' });
    const thenQ = el(root, 'quote', C[0].then.quote, { left: '240px', top: '470px', width: '780px' });
    const nowBox = el(root, '', '', { left: '1040px', top: '150px', width: '640px', textAlign: 'right' });
    const nowCap = el(nowBox, 'caption', `${C[0].now.year} · ${C[0].now.who}`, { position: 'relative' });
    const nowNum = el(nowBox, 'stat', C[0].now.number, { position: 'relative', marginTop: '14px' });
    const nowTxt = el(nowBox, 'body', C[0].now.text, { position: 'relative', marginTop: '6px', color: 'var(--ink)' });

    // ---- Step 1: nested systems -------------------------------------------
    const CX = 1330;
    const CY = 560;
    const R = { n: 400, s: 270, e: 140 };
    const rings = sv(art, 'g');
    const rN = sv(rings, 'circle', { cx: CX, cy: CY, r: R.n, fill: 'rgba(217,199,163,0.03)', stroke: SAND, 'stroke-width': 2, opacity: 0.55 });
    const rS = sv(rings, 'circle', { cx: CX, cy: CY, r: R.s, fill: 'rgba(217,199,163,0.04)', stroke: SAND, 'stroke-width': 2, opacity: 0.8 });
    const rE = sv(rings, 'circle', { cx: CX, cy: CY, r: R.e, fill: 'rgba(232,163,61,0.10)', stroke: AMBER, 'stroke-width': 3 });
    const lab = (txt, y, fill) =>
      Object.assign(sv(rings, 'text', { x: CX, y, 'text-anchor': 'middle', fill, 'font-size': 26, 'letter-spacing': '5', 'font-weight': 500 }), {
        textContent: txt.toUpperCase(),
      });
    const lN = lab(C[1].rings[0], CY - R.n + 48, SAND);
    const lS = lab(C[1].rings[1], CY - R.s + 48, SAND);
    const lE = lab(C[1].rings[2], CY + 9, AMBER);
    const claim = el(root, 'display', '', { left: '128px', top: '360px', width: '700px', fontSize: '76px' });
    const claimW = splitWords(claim, [C[1].claim]);
    const harm = el(root, 'quote harm', C[1].harm, { left: '128px', top: '600px', width: '780px' });

    // ---- Step 2: purpose vs condition, breathing ring ---------------------
    const answer = el(root, 'display', '', { left: '128px', top: '320px', fontSize: '88px' });
    const ansW = C[2].answer.map((ln) => splitWords(el(answer, 'line', ln)));
    ansW[0].slice(0, 2).forEach((w) => (w.style.color = 'var(--amber)'));
    const breath = el(root, 'quote amber', C[2].breath, { left: '128px', top: '580px', width: '900px' });
    const lungs = sv(art, 'g', { opacity: 0 });
    lungs.dataset.ambient = '';
    const b1 = sv(lungs, 'circle', { cx: 1480, cy: 560, r: 150, fill: 'rgba(232,163,61,0.06)', stroke: AMBER, 'stroke-width': 2.5 });
    const b2 = sv(lungs, 'circle', { cx: 1480, cy: 560, r: 150, fill: 'none', stroke: AMBER, 'stroke-width': 1.2, opacity: 0.4 });
    ambient.push(
      gsap.to(b1, { scale: 1.14, svgOrigin: '1480 560', duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
      gsap.fromTo(b2, { scale: 1, opacity: 0.45 }, { scale: 1.7, opacity: 0, svgOrigin: '1480 560', duration: 5.2, repeat: -1, ease: 'sine.out' }),
    );

    // ---- Step 3: time horizon ---------------------------------------------
    const AX = { x0: 300, x1: 1620, y: 600 };
    const ticksX = [360, 960, 1560];
    const axisTitle = el(root, 'caption center', C[3].axisTitle, { top: '300px' });
    const axis = sv(art, 'line', { x1: AX.x0, y1: AX.y, x2: AX.x1, y2: AX.y, stroke: SAND, 'stroke-width': 2, opacity: 0.5 });
    const grad = sv(sv(art, 'defs'), 'linearGradient', { id: 'horizon', x1: ticksX[0], x2: ticksX[2], y1: 0, y2: 0, gradientUnits: 'userSpaceOnUse' });
    sv(grad, 'stop', { offset: '0', 'stop-color': TERRA });
    sv(grad, 'stop', { offset: '0.5', 'stop-color': SAND });
    sv(grad, 'stop', { offset: '1', 'stop-color': AMBER });
    const trail = sv(art, 'line', { x1: ticksX[0], y1: AX.y, x2: ticksX[0], y2: AX.y, stroke: 'url(#horizon)', 'stroke-width': 5, 'stroke-linecap': 'round' });
    const ticks = ticksX.map((x) => sv(art, 'line', { x1: x, y1: AX.y - 14, x2: x, y2: AX.y + 14, stroke: SAND, 'stroke-width': 2 }));
    const tickLabels = C[3].horizons.map((h, i) => el(root, 'caption', h, { left: `${ticksX[i] - 200}px`, top: `${AX.y + 36}px`, width: '400px', textAlign: 'center' }));
    const marker = sv(art, 'circle', { cx: ticksX[0], cy: AX.y, r: 14, fill: TERRA });
    const pill = el(root, '', '', { left: `${ticksX[0] - 300}px`, top: '470px', width: '600px', height: '70px' });
    const stateColors = ['var(--terracotta-text)', 'var(--sand)', 'var(--amber)'];
    const states = C[3].states.map((s, i) =>
      el(pill, 'quote', s, { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: stateColors[i], fontStyle: 'normal', fontSize: '48px' }),
    );
    const after = el(root, 'quote center', C[3].after, { top: '770px' });

    // ---- Step 4: evidence pair --------------------------------------------
    const U = C[4].unilever;
    const Dn = C[4].danone;
    const uCap = el(root, 'caption', U.label, { left: '128px', top: '240px' });
    const uNum = el(root, 'stat', '0%', { left: '120px', top: '292px', fontSize: '190px' });
    const uTxt = el(root, 'body', U.text, { left: '128px', top: '490px', width: '740px', color: 'var(--ink)', fontSize: '34px' });
    const divider = sv(art, 'line', { x1: 900, y1: 250, x2: 900, y2: 700, stroke: SAND, 'stroke-width': 1.5, opacity: 0.35 });
    const dCap = el(root, 'caption', Dn.label, { left: '1000px', top: '240px' });
    const dWhen1 = el(root, 'caption amber', Dn.before.when, { left: '1000px', top: '300px' });
    const dTxt1 = el(root, 'quote', Dn.before.text, { left: '1000px', top: '340px', width: '800px', fontSize: '44px' });
    const arrow = sv(art, 'path', { d: 'M 1012 470 L 1012 560 M 1000 546 L 1012 562 L 1024 546', fill: 'none', stroke: SAND, 'stroke-width': 2, opacity: 0.8 });
    const dGap = el(root, 'caption', Dn.gap, { left: '1050px', top: '500px' });
    const dWhen2 = el(root, 'caption harm', Dn.after.when, { left: '1000px', top: '590px' });
    const dTxt2 = el(root, 'quote harm', Dn.after.text, { left: '1000px', top: '628px', fontSize: '64px', fontStyle: 'normal' });
    const line = el(root, 'display', C[4].line, { left: '128px', top: '800px', fontSize: '66px' });
    const lineW = splitWords(line);
    const uState = { v: 0 };
    let shownU = '';
    const off = stage.onFrame(() => {
      const t = `${Math.round(uState.v)}${U.suffix}`;
      if (t !== shownU) uNum.textContent = shownU = t;
    });

    // ---- Timeline -----------------------------------------------------------
    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    tl.set(fs, { s: field.at('route'), opacity: 0.55, turb: 1.1, size: 2.3, scale: 1, x: 0, y: 0, z: 0 }, 0);
    tl.set(stage.rig, { x: 0, y: 0, z: 10, lookX: 0, lookY: 0 }, 0);
    tl.set([rings, lungs], { opacity: 0 }, 0);
    tl.set([tline, n70, n19, axis, trail, marker, divider, arrow, ...ticks], { opacity: 0 }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — the road sinks into the background; 1970 → 2019, the line bends.
    let t = tl.duration();
    tl.to(fs, { opacity: 0.07, y: -1.6, z: -3, duration: 2.5, ease: 'sine.inOut' }, t);
    reveal(tl, kicker, t, { duration: 1, y: 10 });
    tl.set(tline, { opacity: 0.8 }, t + 0.3);
    draw(tl, tline, t + 0.3, { duration: 1.8 });
    tl.fromTo(n70, { opacity: 0, attr: { r: 0 } }, { opacity: 1, attr: { r: 10 }, duration: 0.6, ease: 'back.out(2)' }, t + 0.9);
    reveal(tl, thenCap, t + 1.0, { duration: 0.9, y: 10 });
    reveal(tl, thenQ, t + 1.3, { duration: 1.3 });
    tl.fromTo(tline, { attr: { d: D0 } }, { attr: { d: D1 }, duration: 1.8, ease: 'power3.inOut' }, t + 3.4);
    tl.fromTo(n19, { opacity: 0, attr: { cy: 640 } }, { opacity: 1, attr: { cy: 420 }, duration: 1.8, ease: 'power3.inOut' }, t + 3.4);
    reveal(tl, nowCap, t + 4.4, { duration: 0.9, y: 10 });
    reveal(tl, nowNum, t + 4.6, { duration: 1.2 });
    reveal(tl, nowTxt, t + 5.0, { duration: 1.0, y: 10 });
    tl.addLabel('s0');

    // Step 1 — economy ⊂ society ⊂ nature; then the economy eats its host.
    t = tl.duration();
    conceal(tl, [thenCap, thenQ, nowBox], t, { duration: 0.6 });
    tl.to([tline, n70, n19], { opacity: 0, duration: 0.6 }, t);
    tl.set(rings, { opacity: 1 }, t + 0.5);
    for (const [c, r, lbl, d] of [[rN, R.n, lN, 0.5], [rS, R.s, lS, 0.8], [rE, R.e, lE, 1.1]]) {
      tl.fromTo(c, { attr: { r: 0 }, opacity: 0 }, { attr: { r }, opacity: c === rN ? 0.55 : c === rS ? 0.8 : 1, duration: 1.5, ease: 'power3.out' }, t + d);
      tl.fromTo(lbl, { opacity: 0 }, { opacity: 1, duration: 0.8 }, t + d + 0.8);
    }
    revealWords(tl, claimW, t + 1.2, { stagger: 0.08 });
    const eat = t + 4.4;
    tl.to(rE, { attr: { r: 332 }, stroke: TERRA, fill: 'rgba(181,86,58,0.22)', duration: 3.2, ease: 'power2.inOut' }, eat);
    tl.to(rS, { attr: { r: 350 }, opacity: 0.5, duration: 3.2, ease: 'power2.inOut' }, eat);
    tl.to(rN, { attr: { r: 366 }, opacity: 0.35, duration: 3.2, ease: 'power2.inOut' }, eat);
    tl.to([lN, lS], { opacity: 0, duration: 0.8 }, eat + 0.4);
    tl.to(lE, { attr: { fill: '#d9785a' }, duration: 1.5 }, eat + 1);
    reveal(tl, harm, eat + 2.2, { duration: 1.4 });
    tl.addLabel('s1');

    // Step 2 — the answer; a ring that breathes.
    t = tl.duration();
    conceal(tl, [claim, harm], t, { duration: 0.6 });
    tl.to(rings, { opacity: 0, duration: 0.8, ease: 'power2.in' }, t);
    revealWords(tl, ansW[0], t + 0.6, { stagger: 0.08 });
    revealWords(tl, ansW[1], t + 1.8, { stagger: 0.08 });
    tl.fromTo(lungs, { opacity: 0 }, { opacity: 1, duration: 2, ease: 'sine.inOut' }, t + 1.4);
    reveal(tl, breath, t + 3.2, { duration: 1.4 });
    tl.addLabel('s2');

    // Step 3 — the time horizon: the verdict changes as the horizon lengthens.
    t = tl.duration();
    conceal(tl, [answer, breath], t, { duration: 0.6 });
    tl.to(lungs, { opacity: 0, duration: 0.8 }, t);
    reveal(tl, axisTitle, t + 0.5, { duration: 1, y: 10 });
    tl.set(axis, { opacity: 0.5 }, t + 0.5);
    draw(tl, axis, t + 0.5, { duration: 1.3 });
    ticks.forEach((k, i) => tl.fromTo(k, { opacity: 0 }, { opacity: 0.8, duration: 0.5 }, t + 0.9 + i * 0.2));
    tickLabels.forEach((k, i) => reveal(tl, k, t + 1.0 + i * 0.2, { duration: 0.8, y: 8 }));
    tl.fromTo(marker, { opacity: 0, attr: { r: 0 } }, { opacity: 1, attr: { r: 14 }, duration: 0.6, ease: 'back.out(2)' }, t + 1.6);
    tl.set(trail, { opacity: 1 }, t + 1.6);
    reveal(tl, states[0], t + 1.8, { duration: 0.9, y: 10 });
    const slide = t + 3.2;
    const move = { duration: 4.2, ease: 'power1.inOut' };
    tl.fromTo(marker, { attr: { cx: ticksX[0] }, fill: TERRA }, { attr: { cx: ticksX[2] }, fill: AMBER, ...move }, slide);
    tl.fromTo(trail, { attr: { x2: ticksX[0] } }, { attr: { x2: ticksX[2] }, ...move }, slide);
    tl.fromTo(pill, { x: 0 }, { x: ticksX[2] - ticksX[0], ...move }, slide);
    tl.to(states[0], { opacity: 0, duration: 0.5 }, slide + 1.3);
    tl.fromTo(states[1], { opacity: 0 }, { opacity: 1, duration: 0.5 }, slide + 1.6);
    tl.to(states[1], { opacity: 0, duration: 0.5 }, slide + 2.9);
    tl.fromTo(states[2], { opacity: 0 }, { opacity: 1, duration: 0.6 }, slide + 3.3);
    reveal(tl, after, slide + 4.3, { duration: 1.3 });
    tl.addLabel('s3');

    // Step 4 — evidence both ways: Unilever, then Danone.
    t = tl.duration();
    conceal(tl, [axisTitle, pill, after, ...tickLabels], t, { duration: 0.6 });
    tl.to([axis, trail, marker, ...ticks], { opacity: 0, duration: 0.6 }, t);
    reveal(tl, uCap, t + 0.6, { duration: 0.9, y: 10 });
    reveal(tl, uNum, t + 0.7, { duration: 0.9 });
    tl.fromTo(uState, { v: 0 }, { v: U.value, duration: 1.8, ease: 'power2.out' }, t + 0.8);
    reveal(tl, uTxt, t + 1.4, { duration: 1.0, y: 10 });
    tl.fromTo(divider, { opacity: 0 }, { opacity: 0.35, duration: 1 }, t + 1.6);
    reveal(tl, dCap, t + 2.4, { duration: 0.9, y: 10 });
    reveal(tl, dWhen1, t + 2.6, { duration: 0.9, y: 10 });
    reveal(tl, dTxt1, t + 2.8, { duration: 1.2 });
    tl.set(arrow, { opacity: 0.8 }, t + 4.2);
    draw(tl, arrow, t + 4.2, { duration: 1.0 });
    reveal(tl, dGap, t + 4.4, { duration: 0.9, y: 8 });
    reveal(tl, dWhen2, t + 5.3, { duration: 0.9, y: 10 });
    reveal(tl, dTxt2, t + 5.5, { duration: 1.4, blur: 14 });
    revealWords(tl, lineW, t + 7.2, { stagger: 0.07 });
    tl.addLabel('s4');

    return {
      tl,
      steps: C.length,
      leave() {
        return gsap.timeline().to(root, { opacity: 0, duration: 0.8, ease: 'power2.in' });
      },
      dispose() {
        off();
        ambient.forEach((a) => a.kill());
        root.remove();
      },
    };
  },
};
