import { gsap } from 'gsap';
import { toPx } from '../engine/stage.js';
import { ROUTE_ENDS, routePx } from '../engine/shapes.js';
import { el, splitWords, revealWords, reveal, conceal } from '../engine/text.js';

// Scene 1 — Title / thesis. The ship dissolves into the Silk Road; the inn lights.
export default {
  id: 'title',
  create({ stage, stageEl, field, content }) {
    const C = content.scenes[1].steps;
    const root = el(stageEl, 'scene');

    // Place-name captions pinned under the two ends of the route.
    const [ex] = toPx(...routePx(...ROUTE_ENDS.china));
    const [wx] = toPx(...routePx(...ROUTE_ENDS.inn));
    const east = el(root, 'caption', C[0].places.east, { left: `${ex - 200}px`, top: '772px', width: '400px', textAlign: 'center' });
    const west = el(root, 'caption', C[0].places.west, { left: `${wx - 200}px`, top: '772px', width: '400px', textAlign: 'center' });

    const kicker = el(root, 'caption center', C[1].kicker, { top: '118px' });
    const title = el(root, 'display center', C[1].title, { top: '176px', fontSize: '100px' });
    const subtitle = el(root, 'question center', C[1].subtitle, { top: '306px', fontSize: '58px' });

    const thesis = el(root, 'display', '', { left: '128px', top: '96px', fontSize: '84px', lineHeight: '1.12' });
    const beats = C[2].thesis.map((ln) => splitWords(el(thesis, 'line', ln)));
    // "fairly" carries the argument: amber.
    beats[2].forEach((w) => /fairly/.test(w.textContent) && (w.style.color = 'var(--amber)'));
    const tail = el(root, 'question', C[2].thesisTail, { left: '128px', top: '392px', fontSize: '52px' });

    const tl = gsap.timeline({ paused: true });
    const fs = field.state;
    // Entry = Scene 0's end state.
    tl.set(fs, { s: field.at('ship'), opacity: 1, turb: 1.1, size: 2.3, scale: 1, x: 5.4, y: 0, z: -9 }, 0);
    tl.set(stage.rig, { x: 0, y: 0.35, z: 10, lookX: 0, lookY: 0.15 }, 0);
    tl.addLabel('start', 0.02);

    // Step 0 — the ship comes apart and redraws itself as a road, east → west.
    let t = tl.duration();
    // The ship dissolves where it is; the cloud drifts to centre while it is
    // formless, so nothing reads as the ship sailing back.
    tl.to(fs, { s: field.at('route'), duration: 5.4, ease: 'sine.inOut' }, t);
    tl.to(fs, { turb: 1.8, duration: 2.2, ease: 'sine.out' }, t);
    tl.to(fs, { turb: 1.1, duration: 2.4, ease: 'sine.inOut' }, t + 2.6);
    tl.to(fs, { x: 0, z: 0, duration: 3.0, ease: 'sine.inOut' }, t + 1.4);
    tl.to(stage.rig, { y: 0, lookY: 0, duration: 3.2, ease: 'sine.inOut' }, t + 1.2);
    reveal(tl, east, t + 1.8, { duration: 1.2, y: 10 });
    reveal(tl, west, t + 4.4, { duration: 1.2, y: 10 });
    tl.addLabel('s0');

    // Step 1 — title.
    t = tl.duration();
    reveal(tl, kicker, t, { duration: 1.0, y: 10 });
    revealWords(tl, splitWords(title), t + 0.3, { stagger: 0.07, duration: 1.2 });
    reveal(tl, subtitle, t + 1.4, { duration: 1.4, blur: 12 });
    tl.addLabel('s1');

    // Step 2 — thesis in three beats; the road dims so the words lead.
    t = tl.duration();
    conceal(tl, [kicker, title, subtitle], t, { duration: 0.7 });
    tl.to(fs, { opacity: 0.55, duration: 1.5, ease: 'sine.inOut' }, t + 0.3);
    revealWords(tl, beats[0], t + 0.6, { stagger: 0.08 });
    revealWords(tl, beats[1], t + 1.8, { stagger: 0.08 });
    revealWords(tl, beats[2], t + 3.0, { stagger: 0.08 });
    reveal(tl, tail, t + 3.8, { duration: 1.4, blur: 12 });
    tl.addLabel('s2');

    return {
      tl,
      steps: C.length,
      leave() {
        return gsap.timeline().to(root, { opacity: 0, duration: 0.8, ease: 'power2.in' });
      },
      dispose() {
        root.remove();
      },
    };
  },
};
