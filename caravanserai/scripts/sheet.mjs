// Contact sheet of every capture for one scene: shots/sheet-s<N>.png
import { chromium } from 'playwright';
import { readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const scene = process.argv[2] ?? '0';
const files = readdirSync('shots').filter((f) => f.startsWith(`s${scene}-`) && f.endsWith('.png')).sort();
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;font:12px sans-serif;color:#aaa">
${files.map((f) => `<div><img src="${f}" style="width:100%;display:block"><div>${f}</div></div>`).join('')}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2000, height: 400 } });
writeFileSync('shots/sheet.html', html);
await p.goto(pathToFileURL(resolve('shots/sheet.html')).href);
await p.waitForTimeout(500);
await p.screenshot({ path: `shots/sheet-s${scene}.png`, fullPage: true });
await b.close();
