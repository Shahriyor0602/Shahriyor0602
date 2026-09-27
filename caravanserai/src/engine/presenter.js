// Keyboard/clicker controls + the small presenter overlay (P).

const fmt = (s) => {
  const sign = s < 0 ? '-' : '';
  s = Math.abs(Math.round(s));
  return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function createPresenter(director, content) {
  const box = document.getElementById('presenter');
  const black = document.getElementById('blackout');
  let t0 = null; // set on first advance

  function render() {
    if (box.hidden) return;
    const sc = content.scenes[director.si];
    const elapsed = t0 ? (performance.now() - t0) / 1000 : 0;
    const k = director.step;
    // Target time at the end of the current step.
    let stepEnd = sc.start;
    for (let i = 0; i <= k; i++) stepEnd += sc.steps[i]?.t ?? 0;
    const delta = elapsed - stepEnd;
    const nextNote = sc.steps[k + 1]?.note ?? content.scenes[director.si + 1]?.steps[0]?.note ?? '— end —';
    const limitLeft = content.meta.hardLimit - elapsed;
    box.innerHTML = `
      <div class="row"><span class="dim">Scene ${director.si} · ${sc.name}</span><span>${k + 1}/${sc.steps.length}</span></div>
      <div class="row" style="margin-top:6px">
        <span class="big">${fmt(elapsed)}</span>
        <span class="big ${delta > 3 ? 'late' : 'ok'}">${delta >= 0 ? '+' : ''}${fmt(delta)}</span>
      </div>
      <div class="row dim"><span>scene window ${fmt(sc.start)}–${fmt(sc.end)}</span><span>step target ${fmt(stepEnd)}</span></div>
      <div class="row ${limitLeft < 30 ? 'late' : 'dim'}"><span>target ${fmt(content.meta.targetTotal)} · hard limit ${fmt(content.meta.hardLimit)}</span><span>${fmt(limitLeft)} left</span></div>
      <div class="note"><span class="dim">Now:</span> ${sc.steps[k]?.note ?? '(armed — press → to begin)'}</div>
      <div class="note"><span class="dim">Next:</span> ${nextNote}</div>
      <div class="keys">→ / Space / click next · ← back · B blackout · F fullscreen · Home restart · P hide</div>`;
  }
  setInterval(render, 250);

  const onAdvance = () => {
    if (t0 === null) t0 = performance.now();
  };

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        e.preventDefault();
        onAdvance();
        director.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault();
        director.prev();
        break;
      case 'b':
      case 'B':
      case '.': // many clickers send "." for blackout
        black.classList.toggle('on');
        break;
      case 'p':
      case 'P':
        box.hidden = !box.hidden;
        render();
        break;
      case 'f':
      case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
        break;
      case 'Home':
        e.preventDefault();
        t0 = null;
        black.classList.remove('on');
        director.restart();
        break;
    }
    render();
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || box.contains(e.target)) return;
    onAdvance();
    director.next();
  });

  // Hide the cursor when idle.
  let idle;
  window.addEventListener('pointermove', () => {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add('idle'), 1800);
  });

  return { render };
}
