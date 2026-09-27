// Plays the whole deck with real key presses (animations sped up 12×), then
// steps all the way back. Reports errors and the step count reached.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(pathToFileURL(resolve('dist/index.html')).href);
await p.waitForFunction(() => window.deck);
await p.evaluate(() => window.deck.gsap.globalTimeline.timeScale(12));
const pos = () => p.evaluate(() => `${window.deck.director.si}.${window.deck.director.step}`);
let presses = 0;
for (;;) {
  const before = await pos();
  await p.keyboard.press('ArrowRight');
  presses++;
  await p.waitForFunction(() => !window.deck.director.active, null, { timeout: 20000 });
  const after = await pos();
  if (after === before) break;
  if (presses > 80) break;
}
const end = await pos();
let backs = 0;
while ((await pos()) !== '0.-1' && backs < 80) {
  await p.keyboard.press('ArrowLeft');
  backs++;
}
console.log(`forward: ${presses - 1} steps → ended at ${end}; back: ${backs} presses → ${await pos()}`);
console.log(errors.length ? 'errors:\n  ' + errors.join('\n  ') : 'no page errors');
await b.close();
