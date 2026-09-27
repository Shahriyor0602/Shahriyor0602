import * as THREE from 'three';
import { gsap } from 'gsap';
import { el, splitWords, revealWords, reveal, conceal, svg, sv, draw } from '../engine/text.js';
import { ARAL, pathD, project } from '../engine/geo.js';
import { createCar } from './car.js';

// Scene 3 — Q2: Equity.  ★ Signature 2 (the road falls away).
const AMBER = '#e8a33d';

export default {
  id: 'equity',
  create({ stage, stageEl, field, content }) {
    const SC = content.scenes[3];
    const C = SC.steps;
    const root = el(stageEl, 'scene');
    const kicker = el(root, 'caption', SC.kicker, { left: '128px', top: '92px' });
    const art = svg(root);

    // ---- Step 0: the three values ------------------------------------------
    const cols = C[0].values.map((v, i) => {
      const x = 128 + i * 600;
      const word = el(root, 'display', v.word, { left: `${x}px`, top: '330px', fontSize: '86px' });
      const plain = el(root, 'quote', v.plain, { left: `${x}px`, top: '450px', fontSize: '40px', color: 'var(--ink-dim)' });
      return { word, plain };
    });
    const pick = el(root, 'caption amber', C[0].pick, { left: '1328px', top: '560px' });

    // ---- Step 1–2: the car ---------------------------------------------------
    const carLines = C[1].car.map((ln, i) => el(root, 'lead', ln, { left: '128px', top: `${250 + i * 92}px`, fontSize: '58px' }));
    const crash = el(root, 'quote center', C[2].crash, { top: '470px', fontSize: '52px' });
    const car = createCar(stage);
    const prevFog = stage.scene.fog;
    stage.scene.fog = new THREE.Fog(0x0b0e1a, 8, 17);

    // ---- Step 3–5: case cards ---------------------------------------------
    const cards = [3, 4, 5].map((k, i) => {
      const d = C[k].card;
      const x = 128 + i * 600;
      const box = el(root, '', '', { left: `${x}px`, top: '290px', width: '500px' });
      el(box, 'caption', `${d.name} · ${d.year}`, { position: 'relative' });
      el(box, 'stat' + (k === 5 ? ' harm' : ''), d.stat, { position: 'relative', marginTop: '18px', color: k === 5 ? 'var(--terracotta-text)' : 'var(--ink)' });
      el(box, 'body', d.statNote, { position: 'relative', marginTop: '14px', color: 'var(--ink)' });
      el(box, 'body', d.more, { position: 'relative', marginTop: '10px', fontSize: '26px' });
      return box;
    });
    const fairness = el(root, 'display', '', { left: '128px', top: '800px', fontSize: '64px' });
    const fairW = splitWords(fairness, [C[5].line]);
    fairW.slice(-2).forEach((w) => (w.style.color = 'var(--terracotta-text)'));

    // ---- Step 6–7: Uzbek cotton --------------------------------------------
    const uCap = el(root, 'caption', C[6].region, { left: '128px', top: '250px' });
    const uNum = el(root, 'stat', C[6].stat, { left: '120px', top: '296px', fontSize: '170px' });
    const uNote = el(root, 'body', C[6].statNote, { left: '128px', top: '480px', width: '600px', color: 'var(--ink)', fontSize: '34px' });
    const uWhy = el(root, 'quote', C[6].why, { left: '128px', top: '600px', width: '600px', fontSize: '38px', color: 'var(--ink-dim)' });
    const lift = C[7].lift.map((it, i) => {
      const box = el(root, '', '', { left: '128px', top: `${320 + i * 150}px`, width: '600px' });
      el(box, 'caption amber', it.when, { position: 'relative' });
      el(box, 'body', it.text, { position: 'relative', marginTop: '8px', color: 'var(--ink)', fontSize: '32px' });
      return box;
    });
    const access = el(root, 'display', '', { left: '128px', top: '650px', width: '640px', fontSize: '56px', lineHeight: '1.12' });
    const accessW = splitWords(access, [C[7].line]);
    accessW.slice(-2).forEach((w) => (w.style.color = 'var(--amber)'));
    // Trade routes reach outward from the border (never back across the text).
    const trade = [
      [[73.1, 40.9], [2000, 430]], [[71.2, 41.8], [2000, 170]], [[72.0, 40.3], [2000, 760]],
      [[67.7, 37.2], [1560, 1140]], [[64.9, 43.7], [1300, -60]], [[58.5, 45.6], [980, -60]], [[70.9, 42.25], [1760, -60]],
    ].map(([a, b]) => {
      const [x1, y1] = project(a);
      return sv(art, 'path', { d: `M ${x1} ${y1} L ${b[0]} ${b[1]}`, stroke: AMBER, 'stroke-width': 2, fill: 'none', opacity: 0, 'stroke-linecap': 'round' });
    });

    // ---- Step 8: Aral Sea ------------------------------------------------------
    const [ox, oy] = project([59.0, 45.1]);
    const aral = sv(art, 'path', { d: pathD(ARAL), fill: 'rgba(110,145,200,0.30)', stroke: '#9bb6dc', 'stroke-width': 2.5, opacity: 0 });
    const aCap = el(root, 'caption', C[8].sea, { left: '128px', top: '250px' });
    const aThenY = el(root, 'caption', C[8].then.year, { left: '128px', top: '320px' });
    const aThenV = el(root, 'stat', C[8].then.value, { left: '120px', top: '356px', fontSize: '104px', color: '#b8cbe6' });
    const aNowY = el(root, 'caption', C[8].now.year, { left: '128px', top: '500px' });
    const aNowV = el(root, 'stat', C[8].now.value, { left: '120px', top: '536px', fontSize: '104px', color: 'var(--terracotta-text)' });
    const aNowT = el(root, 'body', C[8].now.text, { left: '128px', top: '650px', color: 'var(--ink)' });
    const unborn = el(root, 'quote amber', C[8].line, { left: '128px', top: '760px', width: '760px', fontSize: '50px' });

    // ---- Step 9: where we disagreed -------------------------------------------
    const tag = el(root, 'caption', C[9].tag, { left: '128px', top: '330px' });
    const dis = el(root, 'display', '', { left: '128px', top: '390px', fontSize: '74px', lineHeight: '1.18' });
    const disW = C[9].lines.map((ln) => splitWords(el(dis, 'line', ln)));
    disW[1][0].style.color = 'var(--amber)';

    // ---- Timeline ---------------------------------------------------------------
    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    const cs = car.state;
    tl.set(fs, { s: field.at('route'), opacity: 0.07, turb: 1.1, size: 2.3, scale: 1, x: 0, y: -1.6, z: -3 }, 0);
    tl.set(stage.rig, { x: 0, y: 0, z: 10, lookX: 0, lookY: 0 }, 0);
    tl.set(cs, { visible: 0, engine: 0, steer: 0, build: 0, speed: 0, fall: 0, drop: 0 }, 0);
    tl.set(aral, { opacity: 0, scale: 1, svgOrigin: `${ox} ${oy}` }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — three values; equity is ours.
    let t = tl.duration();
    reveal(tl, kicker, t, { duration: 1, y: 10 });
    cols.forEach((c, i) => {
      reveal(tl, c.word, t + 0.3 + i * 0.35, { duration: 1.2 });
      reveal(tl, c.plain, t + 0.8 + i * 0.35, { duration: 1.0, y: 10 });
    });
    tl.to([cols[0].word, cols[1].word, cols[0].plain, cols[1].plain], { opacity: 0.32, duration: 1.2 }, t + 3.2);
    tl.to(cols[2].word, { color: AMBER, duration: 1.2 }, t + 3.2);
    reveal(tl, pick, t + 3.6, { duration: 1, y: 10 });
    tl.addLabel('s0');

    // Step 1 — engine, steering, road.
    t = tl.duration();
    conceal(tl, [...cols.flatMap((c) => [c.word, c.plain]), pick], t, { duration: 0.6 });
    tl.to(stage.rig, { y: 1.5, lookY: -0.7, duration: 2, ease: 'power2.inOut' }, t);
    tl.to(fs, { opacity: 0, duration: 1.2 }, t);
    tl.to(cs, { visible: 1, duration: 1.2, ease: 'sine.inOut' }, t + 0.4);
    reveal(tl, carLines[0], t + 0.9, { duration: 1.1 });
    tl.to(cs, { engine: 1, duration: 1.2, ease: 'power2.out' }, t + 1.0);
    reveal(tl, carLines[1], t + 3.0, { duration: 1.1 });
    tl.to(cs, { steer: 1, duration: 1.0, ease: 'power2.out' }, t + 3.1);
    reveal(tl, carLines[2], t + 5.1, { duration: 1.1 });
    tl.to(cs, { build: 1, duration: 2.4, ease: 'power2.out' }, t + 5.2);
    tl.to(cs, { speed: 2.2, duration: 1.8, ease: 'sine.in' }, t + 6.4);
    tl.addLabel('s1');

    // Step 2 — ★ the road falls away; the car stalls and drops into the dark.
    t = tl.duration();
    conceal(tl, carLines, t, { duration: 0.6 });
    tl.to(cs, { fall: 1, duration: 2.8, ease: 'power1.in' }, t + 0.3);
    tl.to(cs, { speed: 0, duration: 1.4, ease: 'power2.out' }, t + 0.6);
    tl.to(cs, { engine: 0.15, steer: 0, duration: 1.2 }, t + 1.2);
    tl.to(cs, { drop: 1, duration: 1.8, ease: 'power2.in' }, t + 2.0);
    reveal(tl, crash, t + 3.6, { duration: 1.8, blur: 10 });
    tl.addLabel('s2');

    // Steps 3–5 — the cases: quiet, slow, no counting up.
    t = tl.duration();
    conceal(tl, crash, t, { duration: 0.8 });
    tl.set(cs, { visible: 0 }, t + 0.8);
    tl.to(stage.rig, { y: 0, lookY: 0, duration: 1.5, ease: 'sine.inOut' }, t);
    reveal(tl, cards[0], t + 0.8, { duration: 1.8, y: 12, blur: 6 });
    tl.addLabel('s3');
    t = tl.duration();
    reveal(tl, cards[1], t, { duration: 1.8, y: 12, blur: 6 });
    tl.addLabel('s4');
    t = tl.duration();
    reveal(tl, cards[2], t, { duration: 2.2, y: 12, blur: 6 });
    revealWords(tl, fairW, t + 2.4, { stagger: 0.09, duration: 1.3 });
    tl.addLabel('s5');

    // Step 6 — Uzbek cotton: the country forms, then dims under the boycott.
    t = tl.duration();
    conceal(tl, [...cards, fairness, kicker], t, { duration: 0.8 });
    tl.to(fs, { s: field.at('uzbek'), duration: 3.6, ease: 'sine.inOut' }, t + 0.3);
    tl.to(fs, { opacity: 1, y: 0, z: 0, size: 2.1, duration: 2.6, ease: 'sine.inOut' }, t + 0.3);
    reveal(tl, uCap, t + 1.0, { duration: 1, y: 10 });
    reveal(tl, uNum, t + 1.3, { duration: 1.3 });
    reveal(tl, uNote, t + 2.0, { duration: 1.1, y: 10 });
    reveal(tl, uWhy, t + 3.0, { duration: 1.3 });
    tl.to(fs, { opacity: 0.25, duration: 2.2, ease: 'sine.inOut' }, t + 4.4);
    tl.addLabel('s6');

    // Step 7 — reform, boycott lifted: the country lights amber, trade reaches out.
    t = tl.duration();
    conceal(tl, [uNum, uNote, uWhy], t, { duration: 0.6 });
    reveal(tl, lift[0], t + 0.6, { duration: 1.2 });
    reveal(tl, lift[1], t + 1.8, { duration: 1.2 });
    // Same points, new colour: calm the turbulence so it reads as a light change.
    tl.to(fs, { turb: 0.06, duration: 0.8 }, t + 1.1);
    tl.to(fs, { s: field.at('uzbekLit'), duration: 3, ease: 'sine.inOut' }, t + 1.9);
    tl.to(fs, { opacity: 1, duration: 1.6, ease: 'sine.inOut' }, t + 1.9);
    trade.forEach((p, i) => {
      tl.set(p, { opacity: 0.75 }, t + 3.4 + i * 0.12);
      draw(tl, p, t + 3.4 + i * 0.12, { duration: 1.6, ease: 'power2.out' });
    });
    revealWords(tl, accessW, t + 4.6, { stagger: 0.08 });
    tl.addLabel('s7');

    // Step 8 — the Aral Sea shrinks to a tenth.
    t = tl.duration();
    conceal(tl, [uCap, ...lift, access], t, { duration: 0.6 });
    tl.to(trade, { opacity: 0, duration: 0.8 }, t);
    tl.to(fs, { opacity: 0.45, duration: 1.2 }, t);
    tl.fromTo(aral, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'sine.inOut' }, t + 0.6);
    reveal(tl, aCap, t + 0.6, { duration: 1, y: 10 });
    reveal(tl, aThenY, t + 1.0, { duration: 0.9, y: 8 });
    reveal(tl, aThenV, t + 1.2, { duration: 1.2 });
    tl.fromTo(aral, { scale: 1 }, { scale: Math.sqrt(0.1), svgOrigin: `${ox} ${oy}`, duration: 4, ease: 'power1.inOut' }, t + 2.8);
    tl.to(aral, { attr: { fill: 'rgba(181,86,58,0.25)', stroke: '#d9785a' }, duration: 4 }, t + 2.8);
    reveal(tl, aNowY, t + 4.4, { duration: 0.9, y: 8 });
    reveal(tl, aNowV, t + 4.6, { duration: 1.3 });
    reveal(tl, aNowT, t + 5.0, { duration: 1.0, y: 8 });
    reveal(tl, unborn, t + 6.6, { duration: 1.6, blur: 12 });
    tl.addLabel('s8');

    // Step 9 — where we disagreed, and the settled answer.
    t = tl.duration();
    conceal(tl, [aCap, aThenY, aThenV, aNowY, aNowV, aNowT, unborn], t, { duration: 0.6 });
    tl.to(aral, { opacity: 0, duration: 0.8 }, t);
    tl.to(fs, { opacity: 0.1, duration: 1.4 }, t);
    reveal(tl, tag, t + 0.6, { duration: 1, y: 10 });
    revealWords(tl, disW[0], t + 0.9, { stagger: 0.08 });
    revealWords(tl, disW[1], t + 2.6, { stagger: 0.08 });
    tl.addLabel('s9');

    return {
      tl,
      steps: C.length,
      leave() {
        return gsap.timeline().to(root, { opacity: 0, duration: 0.8, ease: 'power2.in' });
      },
      dispose() {
        car.dispose();
        stage.scene.fog = prevFog;
        root.remove();
      },
    };
  },
};
