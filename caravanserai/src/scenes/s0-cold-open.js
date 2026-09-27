import { gsap } from 'gsap';
import { disposeObject } from '../engine/stage.js';
import { el, splitWords, revealWords, reveal, conceal } from '../engine/text.js';
import { createWater, createPeople } from './sea.js';

// Scene 0 — Cold open: Ship of Miracles.  ★ Signature 1
export default {
  id: 'cold-open',
  create({ stage, stageEl, field, dust, content }) {
    const C = content.scenes[0].steps;
    const root = el(stageEl, 'scene');

    // ---- DOM --------------------------------------------------------------
    const caption = el(root, 'caption', C[0].caption, { left: '128px', bottom: '112px' });

    const lead = el(root, 'lead center', C[1].lead, { top: '96px' });
    const number = el(root, 'number center', '', { top: '168px' });
    const numLabel = el(root, 'caption center', C[1].counterLabel, { top: '362px' });

    const lines = el(root, 'display center', '', { top: '120px' });
    const lineWords = [splitWords(el(lines, 'line', C[2].lines[0])), splitWords(el(lines, 'line', C[2].lines[1]))];

    const headline = el(root, 'display', '', { left: '128px', top: '176px', width: '1500px' });
    const headWords = splitWords(headline, C[3].headline);
    const question = el(root, 'question', C[3].question, { left: '128px', top: '432px' });

    // ---- 3D ---------------------------------------------------------------
    const water = createWater(stage);
    const people = createPeople(stage);

    // Counter text is derived from the stream progress every frame, so it is
    // correct after any seek. (tabular numerals keep it from jittering)
    const { from, to, suffix } = C[1].counter;
    let shown = '';
    const off = stage.onFrame(() => {
      const fs = field.state;
      water.uniforms.uOpacity.value = water.state.opacity;
      water.uniforms.uShipX.value = fs.x;
      water.uniforms.uShipZ.value = fs.z;
      people.uniforms.uProg.value = people.state.prog;
      people.uniforms.uOpacity.value = people.state.opacity * fs.opacity;
      people.uniforms.uScale.value = fs.scale;
      people.uniforms.uOffset.value.set(fs.x, fs.y, fs.z);
      const p = people.state.prog;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const v = Math.round(from + (to - from) * e);
      const txt = p >= 0.999 ? `${to.toLocaleString('en-US')}${suffix}` : v.toLocaleString('en-US');
      if (txt !== shown) number.textContent = shown = txt;
    });

    // ---- Timeline -----------------------------------------------------------
    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    const S_SHIP = field.at('ship');

    // Entry state (armed: black screen, dust dark, particles scattered).
    tl.set(fs, { s: 0, opacity: 0, turb: 1.1, size: 3.4, scale: 1, x: 0, y: 0, z: 0 }, 0);
    tl.set(stage.rig, { x: 0, y: 0.35, z: 10, lookX: 0, lookY: 0.15, drift: 1 }, 0);
    tl.set(dust, { opacity: 0 }, 0);
    tl.set(water.state, { opacity: 0 }, 0);
    tl.set(people.state, { prog: 0, opacity: 1 }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — black → the ship assembles out of drifting dust on dark water.
    let t = tl.duration();
    tl.to(dust, { opacity: 1, duration: 3, ease: 'sine.inOut' }, t);
    tl.to(fs, { opacity: 1, duration: 2.2, ease: 'sine.inOut' }, t);
    tl.to(fs, { s: S_SHIP, duration: 6.4, ease: 'power2.inOut' }, t + 0.3);
    tl.to(fs, { size: 2.3, duration: 5, ease: 'sine.inOut' }, t + 1.5);
    tl.to(water.state, { opacity: 1, duration: 3.5, ease: 'sine.inOut' }, t + 1.6);
    reveal(tl, caption, t + 4.2, { duration: 1.6, blur: 8, y: 12 });
    tl.addLabel('s0');

    // Step 1 — "Designed for 12 passengers." 12 → 14,000+ as people stream aboard.
    t = tl.duration();
    conceal(tl, caption, t, { duration: 0.8 });
    revealWords(tl, splitWords(lead), t + 0.3, { stagger: 0.06 });
    reveal(tl, number, t + 1.3, { duration: 1.1 });
    reveal(tl, numLabel, t + 2.3, { duration: 1.0, y: 10 });
    tl.to(people.state, { prog: 1, duration: 5.6, ease: 'none' }, t + 2.1);
    tl.addLabel('s1');

    // Step 2 — "Zero lives lost. Five babies born." The ship sails away right.
    t = tl.duration();
    conceal(tl, [lead, number, numLabel], t, { duration: 0.7 });
    revealWords(tl, lineWords[0], t + 0.6, { stagger: 0.09 });
    revealWords(tl, lineWords[1], t + 1.9, { stagger: 0.09 });
    tl.to(fs, { x: 5.4, z: -9, duration: 7, ease: 'power1.inOut' }, t + 0.4);
    tl.addLabel('s2');

    // Step 3 — the claim, then the question.
    t = tl.duration();
    conceal(tl, lines, t, { duration: 0.7 });
    revealWords(tl, headWords, t + 0.5, { stagger: 0.075, duration: 1.2 });
    tl.to(water.state, { opacity: 0.6, duration: 2.5, ease: 'sine.inOut' }, t + 0.5);
    reveal(tl, question, t + 3.4, { duration: 1.6, blur: 14, y: 16 });
    tl.addLabel('s3');

    return {
      tl,
      steps: C.length,
      // Hand-off: fade this scene's DOM and sea; the field carries on.
      leave() {
        const l = gsap.timeline();
        l.to(root, { opacity: 0, duration: 0.9, ease: 'power2.in' }, 0);
        l.to([water.state, people.state], { opacity: 0, duration: 1.6, ease: 'sine.inOut' }, 0);
        return l;
      },
      dispose() {
        off();
        disposeObject(water.points);
        disposeObject(people.points);
        root.remove();
      },
    };
  },
};
