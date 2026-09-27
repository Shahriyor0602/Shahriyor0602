# Caravanserai — motion presentation

Team A-7 · Responsible Management · Kyung Hee University. A 4:40 film-style talk
built with Vite, Three.js and GSAP. It ships as **one self-contained HTML file**
that runs offline from `file://`.

## Run

```bash
npm install
npm run dev      # live preview at http://localhost:5173
npm run build    # → dist/index.html (double-click to present; no network needed)
```

Open `dist/index.html` in Chrome, press **F** for fullscreen, and advance with
the arrow keys or a clicker.

| Key | Action |
| --- | --- |
| → · PageDown · Space · click | next step (a press mid-animation speeds that step up, then advances) |
| ← · PageUp | previous step (restores that step's exact state) |
| B (or `.`) | blackout toggle |
| P | presenter overlay: scene, step, elapsed, ahead/behind target, now/next notes |
| F | fullscreen |
| Home | restart (resets the timer) |

The timer starts on the first press. Deep link to a step's end state with
`?at=SCENE.STEP`, e.g. `dist/index.html?at=0.2`; add `&p` to open the overlay.

## Where things live

- `src/content.js`: **all on-screen text**, per-step target timings and speaker
  notes. Edit wording here only.
- `src/scenes/`: one file per scene. Each builds one paused GSAP timeline with
  a label at the end of every step (`s0`, `s1`, …).
- `src/engine/director.js`: step engine (play to next label, seek back).
- `src/engine/particles.js`: the persistent morphing particle field and
  background dust. `src/engine/shapes.js`: silhouettes drawn on an offscreen
  canvas and sampled into particles.
- `report.pdf`: the source report. Every figure on screen comes from it.

## Before the talk

- **Scene 5 placeholders.** Fill each member's `major` and `lens` in
  `src/content.js` and delete `placeholder: true`. Unfilled entries show a
  dashed outline on screen.
- **Map check.** The Uzbekistan and Aral Sea outlines (`src/engine/geo.js`)
  are hand-simplified. Have a teammate from the region check them.

## Review captures

```bash
npm run build
node scripts/shoot.mjs 0 --mid   # 1920×1080 PNGs of every step (+ mid-animation frames) in shots/
node scripts/sheet.mjs 0         # contact sheet → shots/sheet-s0.png
```

`node scripts/runthrough.mjs` presses through all 32 steps with real key
presses (animations sped up), then all the way back, and reports any page
errors.

`shoot.mjs` also flags any text that sits outside the safe area or overlaps
other text, prints each step's animation length, and checks that stepping back
restores exactly the deep-linked state.
