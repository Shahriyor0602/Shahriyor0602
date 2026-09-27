// Review captures: for each step of a scene, screenshot the settled end state
// at 1920×1080 plus a few mid-animation frames, and audit the visible text for
// clipping (outside the 1920×1080 frame) and overlaps between text blocks.
//
//   node scripts/shoot.mjs 0            # scene 0, uses dist/index.html over file://
//   node scripts/shoot.mjs 0 --mid      # also capture frames while each step plays
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const scene = Number(process.argv[2] ?? 0);
const mid = process.argv.includes('--mid');
// --only=2,6 restricts mid-frame capture to those steps.
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',').map(Number);
const file = resolve('dist/index.html');
if (!existsSync(file)) throw new Error('run `npm run build` first');
const url = pathToFileURL(file).href;
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function load(at) {
  await page.goto(`${url}?at=${at}`);
  await page.waitForFunction(() => window.deck);
}

const audit = () =>
  page.evaluate(() => {
    // A block counts as visible if it (and any split words inside it) are shown.
    const shown = (e) => {
      for (let n = e; n && n.id !== 'stage'; n = n.parentElement)
        if (parseFloat(getComputedStyle(n).opacity) < 0.5) return false;
      return true;
    };
    const stage = document.getElementById('stage').getBoundingClientRect();
    const k = 1920 / stage.width;
    const boxes = [];
    for (const e of document.querySelectorAll('#stage .scene > *')) {
      if (e.tagName === 'svg' || !e.textContent.trim() || !shown(e)) continue;
      const words = [...e.querySelectorAll('.w')];
      const parts = (words.length ? words : e.children.length ? [...e.children] : [e]).filter(shown);
      if (!parts.length) continue;
      // Measure the text itself, not the full-width container.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of parts) {
        const r = document.createRange();
        r.selectNodeContents(p);
        const b = r.getBoundingClientRect();
        x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top);
        x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
      }
      boxes.push({
        text: e.textContent.trim().slice(0, 40),
        x: (x0 - stage.left) * k, y: (y0 - stage.top) * k,
        w: (x1 - x0) * k, h: (y1 - y0) * k,
      });
    }
    const issues = [];
    for (const b of boxes) {
      if (b.x < 64 || b.y < 48 || b.x + b.w > 1856 || b.y + b.h > 1032)
        issues.push(`near/over edge: "${b.text}" [${b.x | 0},${b.y | 0},${b.w | 0}×${b.h | 0}]`);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const c = boxes[j];
        if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h)
          issues.push(`overlap: "${a.text}" × "${c.text}"`);
      }
    const d = window.deck.director;
    const tl = d.inst.tl;
    const labels = tl.labels;
    return { boxes, issues, labels };
  });

await load(`${scene}.0`);
const { labels } = await audit();
const names = Object.keys(labels).sort((a, b) => labels[a] - labels[b]);
console.log('\nStep animation lengths (s):');
for (let i = 1; i < names.length; i++)
  console.log(`  ${names[i].padEnd(5)} ${(labels[names[i]] - labels[names[i - 1]]).toFixed(1)}`);

const steps = names.filter((n) => /^s\d+$/.test(n)).length;
for (let k = 0; k < steps; k++) {
  await load(`${scene}.${k}`);
  await page.waitForTimeout(1500);
  const shot = `shots/s${scene}-${k}.png`;
  await page.screenshot({ path: shot });
  const { issues } = await audit();
  console.log(`\n${shot}`);
  for (const i of issues) console.log('  ⚠ ' + i);
  if (!issues.length) console.log('  ok: no clipping / overlaps');

  if (mid && (!only || only.includes(k))) {
    // Deterministic mid-step frames: seek the scene timeline to exact times.
    const a = labels[k ? `s${k - 1}` : 'start'];
    const b = labels[`s${k}`];
    for (const f of [0.2, 0.4, 0.6, 0.8]) {
      await load(`${scene}.${k - 1}`);
      await page.evaluate((t) => void window.deck.director.inst.tl.seek(t, false), a + (b - a) * f);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `shots/s${scene}-${k}-mid${Math.round(f * 100)}.png` });
    }
  }
}

// Back-navigation check: step forward through the scene, then back, and
// compare DOM opacity snapshots against the deep-linked states.
const snap = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('#stage .scene *')]
      .filter((e) => !e.closest('[data-ambient]'))
      .map((e) => Number(getComputedStyle(e).opacity).toFixed(2))
      .join(''),
  );
const ref = [];
for (let k = 0; k < steps; k++) {
  await load(`${scene}.${k}`);
  ref.push(await snap());
}
await load(`${scene}.${steps - 1}`);
let bad = 0;
for (let k = steps - 2; k >= 0; k--) {
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  if ((await snap()) !== ref[k]) {
    bad++;
    console.log(`  ⚠ back-nav to step ${k} differs from deep-linked state`);
  }
}
console.log(bad ? `\nback-nav: ${bad} mismatches` : '\nback-nav: clean (DOM state matches on every step)');
if (errors.length) console.log('\nPage errors:\n  ' + errors.join('\n  '));
await browser.close();
