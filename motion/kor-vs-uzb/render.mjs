// Renders index.html frame-by-frame with headless Chromium and encodes MP4 via ffmpeg.
// Usage: node render.mjs [916|45] [--stills t1,t2,...]
import { createRequire } from "node:module";
import { spawn, execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(execSync("npm root -g").toString().trim() + "/playwright");

const FORMAT = process.argv[2] === "45" ? "45" : "916";
const stillsArg = process.argv.indexOf("--stills");
const STILLS = stillsArg > -1 ? process.argv[stillsArg + 1].split(",").map(Number) : null;
const FPS = 30;
const W = 1080, H = FORMAT === "45" ? 1350 : 1920;
const here = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "index.html")).href + `?render&f=${FORMAT}`);
await page.waitForFunction(() => window.READY === true);

if (STILLS) {
  for (const t of STILLS) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(here, "out", `still-${FORMAT}-${t}.png`) });
  }
} else {
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  const out = path.join(here, "out", `kor-vs-uzb-${FORMAT === "45" ? "4x5" : "9x16"}.mp4`);
  const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i === frames - 1) {
      await page.screenshot({ path: path.join(here, "out", `poster-${FORMAT === "45" ? "4x5" : "9x16"}.png`) });
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("wrote", out);
}
await browser.close();
