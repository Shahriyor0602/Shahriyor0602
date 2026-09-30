// Deterministic frame-by-frame renderer: drives index.html?record in headless
// Chromium, screenshots each frame and pipes it into ffmpeg (H.264 MP4).
//
//   node render/record.mjs                         # full film → output/equity-road.mp4
//   node render/record.mjs --captions=0            # clean plate without text
//   node render/record.mjs --stills=2,12,24 --out=output/stills
//   node render/record.mjs --start=20 --end=26 --fps=15 --out=output/preview.mp4
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? '1'];
  })
);
const FPS = Number(args.fps || 30);
const W = Number(args.width || 1920);
const H = Number(args.height || 1080);
const CAPTIONS = args.captions !== '0';
const STILLS = args.stills ? args.stills.split(',').map(Number) : null;
const OUT = path.resolve(ROOT, args.out || (STILLS ? 'output/stills' : `output/equity-road${CAPTIONS ? '' : '-clean'}.mp4`));

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    return execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  } catch {
    return 'ffmpeg';
  }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}]`, m.text());
});
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?record=1&fps=${FPS}&captions=${CAPTIONS ? 1 : 0}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__duration);

async function frame(t) {
  await page.evaluate((tt) => window.__renderFrame(tt), t);
  return page.screenshot({ type: 'png' });
}

if (args.cam) await page.evaluate((c) => (window.__camOverride = c.split(',').map(Number)), args.cam);
if (args.nocaptions) await page.addStyleTag({ content: '.ov{display:none}' });
if (STILLS) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const t of STILLS) {
    const buf = await frame(t);
    const f = path.join(OUT, `${args.prefix || 'still'}-${String(t).replace('.', '_')}.png`);
    fs.writeFileSync(f, buf);
    console.log('wrote', f);
  }
} else {
  const start = Number(args.start || 0);
  const end = Number(args.end || duration);
  const n = Math.round((end - start) * FPS);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const ff = spawn(
    ffmpegPath(),
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 17),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      OUT,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(start + i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 10 === 0 || i === n - 1) {
      const el = (Date.now() - t0) / 1000;
      const eta = (el / (i + 1)) * (n - i - 1);
      console.log(`frame ${i + 1}/${n}  ${(el / (i + 1)).toFixed(2)}s/frame  eta ${Math.round(eta)}s`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', OUT);
}

await browser.close();
server.close();
