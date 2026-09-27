import { gsap } from 'gsap';

// The step engine.
//
// Each scene builds ONE paused GSAP timeline with a label at the end of every
// step: 'start', 's0', 's1', …  Advancing plays from the current label to the
// next; going back seeks straight to the previous label, so state is always
// restored exactly (every tween in a scene is seekable by construction).
//
// Scene instances: { tl, steps, leave?(): Timeline, dispose() }.
export class Director {
  constructor(defs, ctx, onChange = () => {}) {
    this.defs = defs;
    this.ctx = ctx;
    this.onChange = onChange;
    this.si = 0;
    this.step = -1; // -1 = armed (black, before the first press)
    this.inst = null;
    this.active = null;
    this.queued = false;
    this.leaving = [];
  }

  label(k) {
    return k < 0 ? 'start' : `s${k}`;
  }

  get built() {
    return this.defs.filter((d) => d.create).length;
  }

  mount(si) {
    const inst = this.defs[si].create(this.ctx);
    // Render the whole timeline once, then rewind: every tween records its
    // start values in order, so later seeks (in any direction) are exact.
    inst.tl.progress(1, true).progress(0, true);
    this.inst = inst;
    this.si = si;
  }

  unmount() {
    this.killActive();
    this.inst?.tl.kill();
    this.inst?.dispose();
    this.inst = null;
  }

  killActive() {
    this.active?.kill();
    this.active = null;
    this.queued = false;
  }

  flushLeaving() {
    for (const l of this.leaving.splice(0)) {
      l.anim.kill();
      l.inst.tl.kill();
      l.inst.dispose();
    }
  }

  // Jump instantly to (scene, step). Used by prev, Home and ?at= deep links.
  goto(si, step) {
    this.flushLeaving();
    this.killActive();
    if (!this.inst || this.si !== si) {
      this.unmount();
      this.mount(si);
    }
    this.step = step;
    this.inst.tl.seek(this.label(step), true);
    this.onChange();
  }

  next() {
    // A press mid-animation fast-forwards the running step, then advances.
    if (this.active) {
      this.active.timeScale(6);
      this.queued = true;
      return;
    }
    this.advance();
  }

  advance() {
    if (this.step < this.inst.steps - 1) return this.playTo(this.step + 1);
    const nx = this.si + 1;
    if (nx < this.defs.length && this.defs[nx].create) this.crossTo(nx);
  }

  playTo(k) {
    this.step = k;
    this.active = this.inst.tl.tweenTo(this.label(k), {
      ease: 'none',
      onComplete: () => {
        this.active = null;
        if (this.queued) {
          this.queued = false;
          this.advance();
        }
        this.onChange();
      },
    });
    this.onChange();
  }

  crossTo(si) {
    this.flushLeaving();
    const old = this.inst;
    const anim = old.leave ? old.leave() : gsap.timeline();
    const entry = { inst: old, anim };
    anim.eventCallback('onComplete', () => {
      const i = this.leaving.indexOf(entry);
      if (i >= 0) this.leaving.splice(i, 1);
      old.tl.kill();
      old.dispose();
    });
    this.leaving.push(entry);
    this.inst = null;
    this.mount(si);
    this.step = -1;
    this.playTo(0);
  }

  prev() {
    this.flushLeaving();
    this.killActive();
    if (this.step > 0) return this.goto(this.si, this.step - 1);
    if (this.si > 0) return this.goto(this.si - 1, this.defs[this.si - 1].steps - 1);
    this.goto(0, -1);
  }

  restart() {
    this.goto(0, -1);
  }
}
