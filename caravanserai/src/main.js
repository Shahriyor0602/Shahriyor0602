import './style.css';
import { gsap } from 'gsap';
import * as content from './content.js';
import { createStage } from './engine/stage.js';
import { MorphField, createDust } from './engine/particles.js';
import * as shapes from './engine/shapes.js';
import { Director } from './engine/director.js';
import { createPresenter } from './engine/presenter.js';
import { SEQUENCE, sceneDefs } from './scenes/index.js';

gsap.ticker.lagSmoothing(500, 33);

// Film grain: a small noise tile generated at load (no image files).
function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

async function boot() {
  makeGrain();
  await document.fonts.load('300 92px Fraunces');
  await document.fonts.load('italic 400 64px Fraunces');
  await document.fonts.load('500 26px Inter');

  const stageEl = document.getElementById('stage');
  const stage = createStage(document.getElementById('gl'), stageEl);
  const dust = createDust(stage);
  const field = new MorphField(stage, 24000, shapes, SEQUENCE);
  field.state.opacity = 0;

  const ctx = { stage, stageEl, field, dust, content };
  const defs = sceneDefs.map((d, i) => ({ ...d, steps: content.scenes[i].steps.length }));
  const director = new Director(defs, ctx);
  const presenter = createPresenter(director, content);
  director.onChange = presenter.render;

  // Deep link for review/capture: ?at=SCENE.STEP (e.g. ?at=0.2), ?p shows overlay.
  const q = new URLSearchParams(location.search);
  const at = q.get('at');
  if (at) {
    const [s, k] = at.split('.').map(Number);
    director.goto(s, k ?? 0);
  } else director.restart();
  if (q.has('p')) document.getElementById('presenter').hidden = false;

  window.deck = { director, stage, field, gsap };
}

boot();
