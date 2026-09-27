// DOM helpers for scene text. All reveals use fromTo so timelines can be
// seeked in either direction and always land in the same state.

export function el(parent, cls, text = '', style = {}) {
  const e = document.createElement('div');
  e.className = cls;
  if (text) e.textContent = text;
  Object.assign(e.style, style);
  parent.appendChild(e);
  return e;
}

// Split an element's text (or given lines) into word spans. Returns the spans.
export function splitWords(e, lines) {
  const src = lines ?? [e.textContent];
  e.textContent = '';
  const words = [];
  src.forEach((ln) => {
    const line = document.createElement('span');
    line.className = 'line';
    ln.split(/(\s+)/).forEach((tok) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        line.appendChild(document.createTextNode(' '));
        return;
      }
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = tok;
      line.appendChild(w);
      words.push(w);
    });
    e.appendChild(line);
  });
  return words;
}

// Word-by-word: rise, un-blur, fade in.
export function revealWords(tl, words, at, { stagger = 0.07, duration = 1.1, y = 40, blur = 12 } = {}) {
  tl.fromTo(
    words,
    { y, opacity: 0, filter: `blur(${blur}px)` },
    { y: 0, opacity: 1, filter: 'blur(0px)', duration, stagger, ease: 'power3.out' },
    at,
  );
}

// Whole-element soft reveal.
export function reveal(tl, targets, at, { duration = 1.2, y = 24, blur = 10, opacity = 1 } = {}) {
  tl.fromTo(
    targets,
    { y, opacity: 0, filter: `blur(${blur}px)` },
    { y: 0, opacity, filter: 'blur(0px)', duration, ease: 'power3.out' },
    at,
  );
}

// Soft exit: drift up a touch, blur out.
export function conceal(tl, targets, at, { duration = 0.7, y = -14 } = {}) {
  tl.fromTo(
    targets,
    { opacity: 1, y: 0, filter: 'blur(0px)' },
    // immediateRender off: an exit must not un-hide the element at build time.
    { opacity: 0, y, filter: 'blur(8px)', duration, ease: 'power2.in', immediateRender: false },
    at,
  );
}

// Inline SVG in stage coordinates (1920×1080).
const NS = 'http://www.w3.org/2000/svg';
export function svg(parent, attrs = {}) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 1920 1080');
  s.setAttribute('width', '1920');
  s.setAttribute('height', '1080');
  Object.assign(s.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  parent.appendChild(s);
  return s;
}
export function sv(parent, tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}

// Stroke draw-on for an SVG path/line/circle (seekable).
export function draw(tl, e, at, { duration = 1.4, ease = 'power2.inOut', slack = 1.5 } = {}) {
  const len = (e.getTotalLength?.() ?? 1000) * slack;
  e.style.strokeDasharray = `${len} ${len}`;
  tl.fromTo(e, { strokeDashoffset: len }, { strokeDashoffset: 0, duration, ease }, at);
}
