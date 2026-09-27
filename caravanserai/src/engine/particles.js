import * as THREE from 'three';

// Shared soft round sprite for every point layer.
export const SPRITE_FRAG = /* glsl */ `
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float a = 1.0 - smoothstep(0.0, 0.5, r);
    a = a * a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol, a * vAlpha);
  }
`;

// ---------------------------------------------------------------------------
// The persistent morphing field — the one thread that runs through the film.
// It holds a fixed number of particles and morphs between named shapes.
// `state.s` is a float index into `sequence`: s = 1.4 means 40 % of the way
// from sequence[1] to sequence[2]. Because it is a plain number, any GSAP
// timeline can tween it and seeking backwards restores it exactly.
// ---------------------------------------------------------------------------
const FIELD_VERT = /* glsl */ `
  attribute vec3 posB;
  attribute vec3 colA;
  attribute vec3 colB;
  attribute float delayB;
  attribute float aRand;
  uniform float uTime, uPR, uMix, uTurb, uSize, uOpacity, uScale;
  uniform vec3 uOffset;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    float t = clamp((uMix - delayB * 0.45) / 0.55, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(position, posB, t);
    float arc = sin(t * 3.14159265);
    vec3 n = vec3(
      sin(aRand * 91.0 + uTime * 0.35 + p.y * 1.3),
      cos(aRand * 57.0 + uTime * 0.30 + p.x * 1.1),
      sin(aRand * 23.0 + uTime * 0.25)
    );
    p += n * arc * uTurb;
    p += vec3(sin(uTime * 0.8 + aRand * 200.0), cos(uTime * 0.7 + aRand * 150.0), 0.0) * 0.006;
    p = p * uScale + uOffset;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aRand * 0.9) * uPR * (10.0 / -mv.z);
    vCol = mix(colA, colB, t);
    vAlpha = uOpacity * (0.78 + 0.22 * sin(uTime * 1.6 + aRand * 60.0));
  }
`;

export class MorphField {
  constructor(stage, count, shapes, sequence) {
    this.count = count;
    this.shapes = shapes; // { name: (count) => { pos, col, delay? } }
    this.sequence = sequence;
    this.cache = new Map();
    this.state = { s: 0, turb: 0.9, opacity: 1, size: 2.4, scale: 1, x: 0, y: 0, z: 0 };

    const g = new THREE.BufferGeometry();
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) rand[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('posB', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('colA', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('colB', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('delayB', new THREE.BufferAttribute(new Float32Array(count), 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

    this.uniforms = {
      uTime: stage.uniforms.uTime,
      uPR: stage.uniforms.uPR,
      uMix: { value: 0 },
      uTurb: { value: 0 },
      uSize: { value: 2.4 },
      uOpacity: { value: 1 },
      uScale: { value: 1 },
      uOffset: { value: new THREE.Vector3() },
    };
    const m = new THREE.ShaderMaterial({
      vertexShader: FIELD_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    stage.scene.add(this.points);
    this.pair = [-1, -1];
    this.defaultDelay = new Float32Array(count);
    for (let i = 0; i < count; i++) this.defaultDelay[i] = Math.random();
    stage.onFrame(() => this.update());
  }

  shape(name) {
    if (!this.cache.has(name)) {
      const data = this.shapes[name](this.count);
      data.delay ??= this.defaultDelay;
      this.cache.set(name, data);
    }
    return this.cache.get(name);
  }

  update() {
    const st = this.state;
    const last = this.sequence.length - 1;
    const s = Math.min(Math.max(st.s, 0), last);
    const i = Math.min(Math.floor(s), Math.max(last - 1, 0));
    const f = s - i;
    const a = this.sequence[i];
    const b = this.sequence[Math.min(i + 1, last)];
    if (this.pair[0] !== i) {
      const g = this.points.geometry;
      const A = this.shape(a);
      const B = this.shape(b);
      g.attributes.position.array.set(A.pos);
      g.attributes.colA.array.set(A.col);
      g.attributes.posB.array.set(B.pos);
      g.attributes.colB.array.set(B.col);
      g.attributes.delayB.array.set(B.delay);
      for (const k of ['position', 'colA', 'posB', 'colB', 'delayB']) g.attributes[k].needsUpdate = true;
      this.pair = [i, i + 1];
    }
    const u = this.uniforms;
    u.uMix.value = f;
    u.uTurb.value = st.turb;
    u.uSize.value = st.size;
    u.uOpacity.value = st.opacity;
    u.uScale.value = st.scale;
    u.uOffset.value.set(st.x, st.y, st.z);
  }

  // Index of a named shape in the sequence (use for tween targets).
  at(name) {
    const i = this.sequence.indexOf(name);
    if (i < 0) throw new Error(`shape "${name}" not in sequence`);
    return i;
  }
}

// ---------------------------------------------------------------------------
// Ambient dust / stars that drift behind everything, all the time.
// ---------------------------------------------------------------------------
const DUST_VERT = /* glsl */ `
  attribute float aRand;
  uniform float uTime, uPR, uOpacity;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float sp = 0.02 + aRand * 0.05;
    p.x = mod(p.x + uTime * sp + 20.0, 40.0) - 20.0;
    p.y += sin(uTime * 0.12 + aRand * 40.0) * 0.25 + uTime * sp * 0.25;
    p.y = mod(p.y + 12.0, 24.0) - 12.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aRand * 3.0) * uPR * (10.0 / -mv.z);
    float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (0.4 + aRand) + aRand * 90.0), 3.0);
    vCol = mix(vec3(0.85, 0.78, 0.64), vec3(0.95, 0.66, 0.28), step(0.9, aRand));
    vAlpha = uOpacity * tw * (0.18 + 0.32 * aRand);
  }
`;

export function createDust(stage, count = 2600) {
  const pos = new Float32Array(count * 3);
  const rand = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = -30 + Math.random() * 34;
    rand[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const uniforms = { uTime: stage.uniforms.uTime, uPR: stage.uniforms.uPR, uOpacity: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: SPRITE_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 0;
  stage.scene.add(pts);
  const state = { opacity: 1 };
  stage.onFrame(() => (uniforms.uOpacity.value = state.opacity));
  return state;
}
