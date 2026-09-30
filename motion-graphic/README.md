# Equity Road — cinematic motion graphic

A 36-second 3D motion graphic for a university business presentation. It uses a
car on a coastal highway as a metaphor:

| Element | Represents | What happens on screen |
| --- | --- | --- |
| Engine (seen through a cutaway body) | **Effectiveness** | Runs the whole time: pistons, crank, cams, belt drive and fan all move, with a soft blue glow on each firing stroke |
| Steering wheel → column → rack → tie rods → front wheels | **Efficiency** | Linked mechanically: the wheel turns through the curves, and the rack and front wheels follow |
| Road (elevated deck) | **Equity** | Smooth at first, then cracks spread and the deck collapses under the car |

## Storyboard

| Time | Chapter | Action |
| --- | --- | --- |
| 0–8 s | **The Journey** | The car cruises on a smooth road. Labels point out the engine, steering wheel and road |
| 8.5–15 s | **1. Stable Growth** | Close tracking shots: the engine powers the car, the steering keeps it in lane |
| 15.5–22.5 s | **2. Growing Challenges** | Cracks spread through the asphalt and the ride gets rougher. The equity meter falls |
| 23–30 s | **3. Loss of Stability** | The deck breaks apart ahead of the car. The car brakes, and the slab under it tips; the engine keeps running and the rear wheels spin |
| 30.5–36 s | **Sustainable Success** | Slow motion. Closing message: *a strong foundation (equity) and efficient direction (efficiency)* |

## Files

- `output/equity-road.mp4`: the finished film, 1920×1080, 30 fps, H.264, with captions
- `output/equity-road-clean.mp4`: the same film without captions or labels, for adding your own titles in PowerPoint or Keynote
- `output/poster.png`: a still frame to use as a thumbnail
- `index.html` + `dist/bundle.js`: the real-time interactive version. It works offline: open `index.html` in Chrome or Edge. Keys: **Space** play/pause, **← →** seek, **R** restart, **F** fullscreen. Add `?captions=0` to hide the text.

## Rebuilding / re-rendering

```bash
npm install
npm run build                                  # bundle src/ → dist/bundle.js
node render/record.mjs                         # full film → output/equity-road.mp4
node render/record.mjs --captions=0            # clean version
node render/record.mjs --stills=5,18,27        # preview frames → output/stills/
node render/record.mjs --start=20 --end=28 --fps=15 --width=960 --height=540 --out=output/preview.mp4
```

The renderer runs frame by frame, so the output is deterministic and smooth
whatever the speed of the machine. It drives headless Chromium through
Playwright and encodes with ffmpeg. `imageio-ffmpeg` (pip) is used when no
`ffmpeg` binary is set in `FFMPEG`.

## Source layout

- `src/timeline.js`: master timeline, car kinematics, the collapse schedule and the camera keyframes
- `src/car.js`: procedural full-size saloon: x-ray body, glass, wheels with motion blur, inline-6 engine internals, steering linkage, suspension
- `src/road.js` / `src/roadMaterial.js`: elevated deck, guardrails, the procedural asphalt and crack shader, Voronoi slab fracture, and dust
- `src/environment.js`: physical sky, image-based lighting, sea, terrain and skyline
- `src/overlay.js`: chapter captions, 3D-anchored labels, the metrics panel and the closing card
