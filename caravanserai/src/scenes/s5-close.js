import { gsap } from 'gsap';
import { el, splitWords, revealWords, reveal, conceal } from '../engine/text.js';

// Scene 5 — Our fields + close. The ship returns, becomes the inn, and holds.
export default {
  id: 'close',
  create({ stage, stageEl, field, content }) {
    const C = content.scenes[5].steps;
    const root = el(stageEl, 'scene');

    // ---- Step 0: members, two rows ---------------------------------------------
    const tag = el(root, 'caption amber', C[0].tag, { left: '128px', top: '150px' });
    const members = C[0].members.map((m, i) => {
      const row = i < 4 ? 0 : 1;
      const col = row ? i - 4 : i;
      const box = el(root, m.placeholder ? 'placeholder' : '', '', {
        left: `${128 + col * 420 + (row ? 210 : 0)}px`, top: `${250 + row * 330}px`, width: '380px',
      });
      el(box, 'caption', m.name, { position: 'relative', fontSize: '24px' });
      el(box, 'lead', m.major, { position: 'relative', marginTop: '8px', fontSize: '40px', color: 'var(--amber-soft)' });
      el(box, 'body', m.lens, { position: 'relative', marginTop: '10px', fontSize: '26px', color: 'var(--ink)' });
      return box;
    });

    // ---- Step 1: closing line ---------------------------------------------------
    const close = el(root, 'display center', '', { top: '120px', fontSize: '60px', lineHeight: '1.18' });
    const closeW = C[1].close.map((ln) => splitWords(el(close, 'line', ln)));
    closeW[1].slice(-4).forEach((w) => (w.style.color = 'var(--amber)'));

    // ---- Step 2: thanks ---------------------------------------------------------
    const thanks = el(root, 'display center', C[2].thanks, { top: '330px', fontSize: '132px' });
    const team = el(root, 'caption center', C[2].team, { top: '520px', fontSize: '28px' });

    // ---- Timeline ---------------------------------------------------------------
    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    tl.set(fs, { s: field.at('inn'), opacity: 1, turb: 1.1, size: 2.2, scale: 1, x: 0, y: 0, z: 0 }, 0);
    tl.set(stage.rig, { x: 0, y: 0, z: 10, lookX: 0, lookY: 0 }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — the inn recedes; each member's field.
    let t = tl.duration();
    tl.to(fs, { opacity: 0.12, y: -0.6, duration: 1.4, ease: 'sine.inOut' }, t);
    reveal(tl, tag, t + 0.4, { duration: 1, y: 10 });
    members.forEach((m, i) => reveal(tl, m, t + 0.8 + i * 0.28, { duration: 1.1, y: 14 }));
    tl.addLabel('s0');

    // Step 1 — back to the ship, then the inn; the closing line.
    t = tl.duration();
    conceal(tl, [tag, ...members], t, { duration: 0.7 });
    tl.to(fs, { s: field.at('ship2'), opacity: 1, y: 0, duration: 3.6, ease: 'sine.inOut' }, t + 0.4);
    tl.to(fs, { s: field.at('inn2'), duration: 3.8, ease: 'sine.inOut' }, t + 5.0);
    revealWords(tl, closeW[0], t + 6.6, { stagger: 0.07 });
    revealWords(tl, closeW[1], t + 8.4, { stagger: 0.08 });
    tl.addLabel('s1');

    // Step 2 — thank you. Hold.
    t = tl.duration();
    conceal(tl, close, t, { duration: 0.8 });
    tl.to(fs, { opacity: 0.4, y: -1.3, duration: 2, ease: 'sine.inOut' }, t + 0.3);
    reveal(tl, thanks, t + 0.9, { duration: 1.8, blur: 14 });
    reveal(tl, team, t + 1.8, { duration: 1.2, y: 10 });
    tl.addLabel('s2');

    return {
      tl,
      steps: C.length,
      dispose() {
        root.remove();
      },
    };
  },
};
