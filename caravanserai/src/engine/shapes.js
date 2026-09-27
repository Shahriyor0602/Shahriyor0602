// Shape generators for the morphing field. Each returns
// { pos: Float32Array(n*3), col: Float32Array(n*3), delay?: Float32Array(n) }.
// Silhouettes are drawn on an offscreen canvas and sampled, so a shape is just
// a drawing — no model files, nothing fetched at runtime.

import { UZBEKISTAN, project } from './geo.js';
import { WORLD_W, WORLD_H } from './stage.js';

const SAND = [0.85, 0.78, 0.64];
const WHITE = [0.94, 0.91, 0.87];
const AMBER = [0.91, 0.64, 0.24];

function mixc(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Draw into an offscreen canvas and return pixel buckets by channel:
//   red   → structure (sand/white)
//   green → light (amber)
//   blue  → faint texture (dim sand: terrain, dunes)
// Edge pixels (a filled pixel with an empty neighbour) are kept separately so
// sampling can favour crisp outlines over flat fills.
function rasterize(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h);
  draw(ctx, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 100;
  const edge = [];
  const fill = [];
  const light = [];
  const faint = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (d[k + 3] <= 100) continue;
      if (d[k + 2] > d[k] && d[k + 2] > d[k + 1]) {
        faint.push(x, y);
        continue;
      }
      if (d[k + 1] > d[k]) {
        light.push(x, y);
        continue;
      }
      const isEdge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      (isEdge ? edge : fill).push(x, y);
    }
  }
  return { edge, fill, light, faint };
}

function pick(arr) {
  const i = (Math.random() * (arr.length / 2)) | 0;
  return [arr[i * 2], arr[i * 2 + 1]];
}

// Map canvas pixels to world space via a box { x0, x1, y0 } (y0 = world y of canvas bottom).
function sampleCanvas(n, w, h, draw, box, opts = {}) {
  const { edge, fill, light, faint } = rasterize(w, h, draw);
  const { edgeShare = 0.5, lightShare = 0.05, faintShare = 0, depth = 0.08, delay: delayFn } = opts;
  const scale = (box.x1 - box.x0) / w;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  const nLight = light.length ? Math.round(n * lightShare) : 0;
  const nFaint = faint.length ? Math.round(n * faintShare) : 0;
  const nEdge = Math.round((n - nLight - nFaint) * edgeShare);
  for (let i = 0; i < n; i++) {
    let src;
    let c;
    let kind = 'edge';
    if (i >= n - nFaint) {
      kind = 'faint';
      src = pick(faint);
      c = SAND.map((v) => v * (0.1 + Math.random() * 0.2));
    } else if (i < nLight) {
      kind = 'light';
      src = pick(light);
      c = mixc(AMBER, [1, 0.8, 0.45], Math.random() * 0.5);
      c = c.map((v) => v * (0.9 + Math.random() * 0.4));
    } else if (i < nLight + nEdge || !fill.length) {
      src = pick(edge);
      c = mixc(SAND, WHITE, Math.random()).map((v) => v * (0.55 + Math.random() * 0.35));
    } else {
      kind = 'fill';
      src = pick(fill);
      c = mixc(SAND, WHITE, Math.random() * 0.4).map((v) => v * (0.16 + Math.random() * 0.2));
    }
    const jx = (Math.random() - 0.5) * scale;
    const jy = (Math.random() - 0.5) * scale;
    const x = box.x0 + (src[0] + 0.5) * scale + jx;
    const y = box.y0 + (h - src[1] - 0.5) * scale + jy;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * depth;
    col.set(c, i * 3);
    delay[i] = delayFn ? delayFn(src[0] / w, 1 - src[1] / h, kind) : Math.random();
  }
  // Shuffle so particle i lands somewhere random in every shape (organic morphs).
  for (let i = n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    for (let k = 0; k < 3; k++) {
      [pos[i * 3 + k], pos[j * 3 + k]] = [pos[j * 3 + k], pos[i * 3 + k]];
      [col[i * 3 + k], col[j * 3 + k]] = [col[j * 3 + k], col[i * 3 + k]];
    }
    [delay[i], delay[j]] = [delay[j], delay[i]];
  }
  return { pos, col, delay };
}

// ---------------------------------------------------------------------------
// Scattered dust: the "before" state of the film.
export function dust(n) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6 + 0.4;
    pos[i * 3 + 2] = -4 + Math.random() * 6;
    const c = Math.random() < 0.08 ? AMBER : SAND;
    col.set(c.map((v) => v * (0.35 + Math.random() * 0.5)), i * 3);
  }
  return { pos, col };
}

// ---------------------------------------------------------------------------
// A WWII "Victory"-type cargo ship in profile, bow to the right.
// Canvas 1600×500 → world x ∈ [-3.4, 3.4], waterline (canvas bottom) at y = WATERLINE.
export const WATERLINE = -1.25;
export const SHIP_BOX = { x0: -3.4, x1: 3.4, y0: WATERLINE };
export const SHIP_CANVAS = { w: 1600, h: 500 };
// Deck heights in canvas px (used to land the refugee stream on deck).
export const SHIP_DECKS = [
  { x0: 240, x1: 630, y: 372 },
  { x0: 970, x1: 1370, y: 372 },
  { x0: 650, x1: 950, y: 280 },
  { x0: 1380, x1: 1540, y: 336 },
];

function drawShip(ctx) {
  const S = 'rgb(255,0,0)';
  const L = 'rgb(0,255,0)';
  ctx.fillStyle = S;
  ctx.strokeStyle = S;
  ctx.lineCap = 'round';

  // Hull: cruiser stern (left), raked bow (right), forecastle and poop raised.
  ctx.beginPath();
  ctx.moveTo(118, 500);
  ctx.bezierCurveTo(80, 470, 58, 420, 56, 352);
  ctx.lineTo(236, 352);
  ctx.lineTo(240, 372);
  ctx.lineTo(1372, 372);
  ctx.lineTo(1380, 336);
  ctx.lineTo(1566, 330);
  ctx.bezierCurveTo(1540, 400, 1510, 460, 1478, 500);
  ctx.closePath();
  ctx.fill();

  // Bulwark rail line along the deck.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(240, 362);
  ctx.lineTo(1372, 362);
  ctx.stroke();

  // Midship house, three tiers, bridge forward (right).
  ctx.fillRect(640, 290, 330, 84);
  ctx.fillRect(672, 238, 280, 54);
  ctx.fillRect(862, 204, 100, 36);
  ctx.fillRect(850, 198, 124, 8); // bridge wings

  // Funnel, raked aft.
  ctx.beginPath();
  ctx.moveTo(760, 240);
  ctx.lineTo(826, 240);
  ctx.lineTo(812, 146);
  ctx.lineTo(748, 146);
  ctx.closePath();
  ctx.fill();

  // Hatch coamings.
  for (const [x, wd] of [
    [1240, 100],
    [1050, 100],
    [470, 110],
    [280, 100],
  ])
    ctx.fillRect(x, 358, wd, 14);

  // Masts and king posts.
  const mast = (x, top, w = 7) => ctx.fillRect(x - w / 2, top, w, 372 - top);
  mast(1180, 64, 8);
  mast(420, 74, 8);
  mast(1330, 186, 6);
  mast(1010, 206, 6);
  mast(262, 196, 6);
  ctx.fillRect(1146, 118, 68, 5); // crosstrees
  ctx.fillRect(386, 128, 68, 5);

  // Booms resting over the hatches, stays and the aerial between mastheads.
  ctx.lineWidth = 3;
  const line = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  line(1180, 300, 1300, 356);
  line(1180, 300, 1070, 356);
  line(420, 304, 540, 356);
  line(420, 304, 300, 356);
  ctx.lineWidth = 2;
  line(1180, 66, 1560, 332);
  line(420, 76, 62, 352);
  line(1180, 120, 1330, 190);
  line(420, 130, 262, 198);

  // Lifeboats on the boat deck.
  for (const x of [690, 900])
    ctx.fillRect(x, 226, 46, 12);

  // Lights: bridge windows, portholes, mast lamps.
  ctx.fillStyle = L;
  for (let x = 872; x < 956; x += 16) ctx.fillRect(x, 212, 9, 9);
  for (let x = 690; x < 950; x += 26) ctx.fillRect(x, 258, 8, 8);
  for (let x = 660; x < 960; x += 30) ctx.fillRect(x, 314, 8, 8);
  for (let x = 170; x < 1460; x += 58) {
    ctx.beginPath();
    ctx.arc(x, 404, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y] of [
    [1180, 62],
    [420, 72],
    [1562, 330],
    [60, 350],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function ship(n) {
  return sampleCanvas(n, SHIP_CANVAS.w, SHIP_CANVAS.h, drawShip, SHIP_BOX, {
    edgeShare: 0.58,
    lightShare: 0.045,
    // Assemble from the waterline up; masts and rigging arrive last.
    delay: (u, v) => Math.min(1, v * 0.55 + Math.random() * 0.45),
  });
}

// Canvas px → world coords for points on the ship (for effects that ride it).
export function shipPx(x, y) {
  const s = (SHIP_BOX.x1 - SHIP_BOX.x0) / SHIP_CANVAS.w;
  return [SHIP_BOX.x0 + x * s, SHIP_BOX.y0 + (SHIP_CANVAS.h - y) * s];
}

// ---------------------------------------------------------------------------
// The Silk Road, abstracted: one caravan route from China (right) to Persia
// (left), oasis stops, faint dunes and ranges, and a small caravanserai at the
// western end whose lamps light last. Not a map, just the idea of one.
// Canvas 1800×500 → world x ∈ [-4.9, 4.9], canvas bottom at y = -2.2.
export const ROUTE_BOX = { x0: -4.9, x1: 4.9, y0: -2.2 };
export const ROUTE_CANVAS = { w: 1800, h: 500 };
export const ROUTE_ENDS = { china: [1680, 250], inn: [170, 300] };

function drawRoute(ctx) {
  const S = 'rgb(255,0,0)';
  const L = 'rgb(0,255,0)';
  const F = 'rgb(0,0,255)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Faint terrain: dune lines along the bottom, a mountain range mid-route.
  ctx.strokeStyle = F;
  ctx.lineWidth = 2;
  for (let r = 0; r < 5; r++) {
    ctx.beginPath();
    for (let x = 0; x <= 1800; x += 10) {
      const y = 400 + r * 20 + Math.sin(x * 0.006 + r * 1.7) * 14 + Math.sin(x * 0.017 + r) * 5;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  const peaks = [
    [760, 170], [820, 70], [870, 130], [930, 40], [990, 120], [1050, 60], [1110, 150], [1160, 110], [1220, 175],
  ];
  peaks.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.beginPath();
  [[420, 200], [470, 140], [520, 190], [560, 150], [620, 205]].forEach(([x, y], i) =>
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.stroke();

  // The route.
  ctx.strokeStyle = S;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(1680, 250);
  ctx.bezierCurveTo(1520, 150, 1330, 360, 1180, 270);
  ctx.bezierCurveTo(1060, 200, 940, 230, 800, 290);
  ctx.bezierCurveTo(640, 350, 520, 250, 380, 280);
  ctx.bezierCurveTo(300, 296, 250, 300, 240, 300);
  ctx.stroke();

  // Oasis stops.
  ctx.fillStyle = S;
  for (const [x, y] of [[1180, 270], [800, 290], [380, 280]]) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // China: a lit city point.
  ctx.fillStyle = L;
  ctx.beginPath();
  ctx.arc(1680, 250, 12, 0, Math.PI * 2);
  ctx.fill();

  // The caravanserai: a walled courtyard with corner towers and an arched gate.
  ctx.fillStyle = S;
  ctx.fillRect(100, 266, 150, 60);
  ctx.fillRect(92, 246, 22, 80);
  ctx.fillRect(236, 246, 22, 80);
  ctx.beginPath();
  ctx.moveTo(152, 326);
  ctx.lineTo(152, 290);
  ctx.arc(175, 290, 23, Math.PI, 0);
  ctx.lineTo(198, 326);
  ctx.closePath();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Lamp-light in the gate and two windows.
  ctx.fillStyle = L;
  ctx.beginPath();
  ctx.moveTo(158, 326);
  ctx.lineTo(158, 292);
  ctx.arc(175, 292, 17, Math.PI, 0);
  ctx.lineTo(192, 326);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(116, 284, 12, 12);
  ctx.fillRect(222, 284, 12, 12);
}

export function route(n) {
  return sampleCanvas(n, ROUTE_CANVAS.w, ROUTE_CANVAS.h, drawRoute, ROUTE_BOX, {
    edgeShare: 0.72,
    lightShare: 0.06,
    faintShare: 0.42,
    depth: 0.05,
    // Draw east → west along the road; the inn and its lamps arrive last.
    delay: (u, v, kind) => {
      if (kind === 'faint') return Math.random() * 0.6;
      if (kind === 'light' && u < 0.2) return 0.94 + Math.random() * 0.06;
      return Math.min(1, (1 - u) * 0.88 + Math.random() * 0.06);
    },
  });
}

// Canvas px → world coords on the route (for labels that sit on it).
export function routePx(x, y) {
  const s = (ROUTE_BOX.x1 - ROUTE_BOX.x0) / ROUTE_CANVAS.w;
  return [ROUTE_BOX.x0 + x * s, ROUTE_BOX.y0 + (ROUTE_CANVAS.h - y) * s];
}

// ---------------------------------------------------------------------------
// Uzbekistan outline in stage pixels (full 1920×1080 frame at z = 0).
const FRAME_BOX = { x0: -WORLD_W / 2, x1: WORLD_W / 2, y0: -WORLD_H / 2 };
let uzbekCache = null;

function drawUzbek(ctx) {
  const path = () => {
    ctx.beginPath();
    UZBEKISTAN.forEach((p, i) => (i ? ctx.lineTo(...project(p)) : ctx.moveTo(...project(p))));
    ctx.closePath();
  };
  path();
  ctx.fillStyle = 'rgb(0,0,255)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgb(255,0,0)';
  ctx.stroke();
}

export function uzbek(n) {
  uzbekCache ??= sampleCanvas(n, 1920, 1080, drawUzbek, FRAME_BOX, {
    edgeShare: 1,
    lightShare: 0,
    faintShare: 0.35,
    depth: 0.04,
    delay: (u) => Math.min(1, u * 0.8 + Math.random() * 0.2),
  });
  return uzbekCache;
}

// Same points, lit amber: the morph ripples west → east as a colour change.
export function uzbekLit(n) {
  const base = uzbek(n);
  const col = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const faint = base.col[i * 3] < 0.3;
    const c = faint ? AMBER.map((v) => v * (0.12 + Math.random() * 0.12)) : mixc(AMBER, [1, 0.82, 0.5], Math.random() * 0.5);
    col.set(c, i * 3);
    delay[i] = Math.min(1, (base.pos[i * 3] / WORLD_W + 0.5) * 0.85 + Math.random() * 0.15);
  }
  return { pos: base.pos, col, delay };
}

// ---------------------------------------------------------------------------
// The caravanserai, large: a walled façade with corner towers, a tall pointed
// portal (iwan) glowing from within, and four arcade arches where the Test's
// lanterns hang. Drawn in stage pixels on the full frame.
export const INN_LANTERNS = [
  [1030, 640], [1140, 640], [1520, 640], [1630, 640],
];

function pointedArch(ctx, cx, top, bottom, w) {
  ctx.moveTo(cx - w / 2, bottom);
  ctx.lineTo(cx - w / 2, top + w * 0.55);
  ctx.quadraticCurveTo(cx - w / 2, top + w * 0.1, cx, top);
  ctx.quadraticCurveTo(cx + w / 2, top + w * 0.1, cx + w / 2, top + w * 0.55);
  ctx.lineTo(cx + w / 2, bottom);
  ctx.closePath();
}

function drawInn(ctx) {
  const S = 'rgb(255,0,0)';
  // Ground.
  ctx.fillStyle = 'rgb(0,0,255)';
  ctx.fillRect(780, 868, 1100, 4);
  for (let i = 0; i < 40; i++) ctx.fillRect(760 + Math.random() * 1140, 880 + Math.random() * 60, 30 + Math.random() * 80, 2);

  ctx.fillStyle = S;
  ctx.fillRect(920, 600, 820, 268); // wall
  for (let x = 924; x < 1736; x += 36) ctx.fillRect(x, 584, 20, 18); // crenellations
  ctx.fillRect(880, 520, 80, 348); // towers
  ctx.fillRect(1700, 520, 80, 348);
  ctx.fillRect(872, 508, 96, 14);
  ctx.fillRect(1692, 508, 96, 14);
  ctx.fillRect(1230, 430, 200, 438); // portal block
  ctx.beginPath(); // dome behind the portal
  ctx.arc(1330, 440, 70, Math.PI, 0);
  ctx.fill();

  // Cut openings.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  pointedArch(ctx, 1330, 480, 868, 130);
  for (const [x] of INN_LANTERNS) pointedArch(ctx, x, 720, 868, 64);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Warm light in the portal; the arcade stays dark (faint) until the lanterns.
  ctx.fillStyle = 'rgb(0,255,0)';
  ctx.beginPath();
  pointedArch(ctx, 1330, 500, 868, 104);
  ctx.fill();
  ctx.fillStyle = 'rgb(0,0,255)';
  ctx.beginPath();
  for (const [x] of INN_LANTERNS) pointedArch(ctx, x, 734, 868, 48);
  ctx.fill();
}

export function inn(n) {
  return sampleCanvas(n, 1920, 1080, drawInn, FRAME_BOX, {
    edgeShare: 0.62,
    lightShare: 0.07,
    faintShare: 0.12,
    depth: 0.06,
    delay: (u, v, kind) => (kind === 'light' ? 0.8 + Math.random() * 0.2 : Math.min(1, (1 - v) * 0.6 + Math.random() * 0.35)),
  });
}
