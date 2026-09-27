# South Korea vs Uzbekistan — matchday motion graphic

Match: Tuesday, 06 Oct 2026, kick-off 20:00. Korea in pink, Uzbekistan in white.

## Ready-to-post files (`out/`)

| File | Size | Use for |
| --- | --- | --- |
| `kor-vs-uzb-9x16.mp4` | 1080×1920, 9 s, 30 fps | Reels, TikTok, Stories, Shorts |
| `kor-vs-uzb-4x5.mp4` | 1080×1350, 9 s, 30 fps | Instagram / Facebook / X feed |
| `poster-9x16.png`, `poster-4x5.png` | final frame | cover image / static post |

The videos have no audio track, so you can add a trending sound in-app.

## Editing and re-rendering

`index.html` is the animation. Open it in a browser to see a looping live preview (`?f=45` switches it to 4:5).
Every element is positioned by time in `render(t)`, so the render is deterministic.

```sh
pip install imageio-ffmpeg   # or use a system ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
node render.mjs 916          # -> out/kor-vs-uzb-9x16.mp4 + poster
node render.mjs 45           # -> out/kor-vs-uzb-4x5.mp4 + poster
node render.mjs 916 --stills 2,9   # quick PNG checks at given seconds
```

Needs Node and Playwright (Chromium). Fonts (Anton, Archivo, JetBrains Mono, Black Han Sans; all OFL) are subset in `fonts/`.
The kits are stylized illustrations. They use no official crests or sponsor marks.
