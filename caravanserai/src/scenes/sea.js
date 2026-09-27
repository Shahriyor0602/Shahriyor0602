import * as THREE from 'three';
import { SPRITE_FRAG } from '../engine/particles.js';
import { WATERLINE, SHIP_DECKS, shipPx } from '../engine/shapes.js';

// Night sea: a perspective grid of points with slow swell, crest glints and a
// lantern-amber reflection column that follows the ship.
const WATER_VERT = /* glsl */ `
  attribute float aRand;
  uniform float uTime, uPR, uOpacity, uShipX, uShipZ;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.9 + uTime * 0.55 + p.z * 0.7) * 0.035
            + sin(p.x * 2.1 - uTime * 0.8 + p.z * 1.7) * 0.018
            + sin(p.z * 3.0 + uTime * 1.2 + aRand * 6.0) * 0.01;
    p.y += w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = (3.0 + aRand * 2.4) * uPR * (10.0 / dist);
    float fade = (1.0 - smoothstep(12.0, 46.0, dist)) * smoothstep(3.0, 6.0, dist);
    float crest = smoothstep(0.02, 0.055, w);
    float band = exp(-pow((p.x - uShipX) / 1.9, 2.0)) * step(uShipZ - 0.3, p.z);
    float refl = band * (0.5 + 0.5 * sin(p.z * 5.0 - uTime * 1.6 + aRand * 12.0));
    vCol = mix(vec3(0.42, 0.50, 0.74), vec3(0.98, 0.68, 0.30), clamp(refl, 0.0, 1.0));
    vAlpha = uOpacity * fade * (0.22 + crest * 0.6 + refl * 0.7);
  }
`;

export function createWater(stage) {
  const cols = 230;
  const rows = 66;
  const n = cols * rows;
  const pos = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const z = 6 - 40 * Math.pow(r / (rows - 1), 1.35);
    for (let c = 0; c < cols; c++) {
      pos[i * 3] = -18 + (36 * (c + Math.random() * 0.8)) / cols;
      pos[i * 3 + 1] = WATERLINE - 0.02;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
      rand[i] = Math.random();
      i++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const uniforms = {
    uTime: stage.uniforms.uTime,
    uPR: stage.uniforms.uPR,
    uOpacity: { value: 0 },
    uShipX: { value: 0 },
    uShipZ: { value: 0 },
  };
  const pts = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  pts.frustumCulled = false;
  pts.renderOrder = 1;
  stage.scene.add(pts);
  return { points: pts, uniforms, state: { opacity: 0 } };
}

// Refugees: tiny warm points streaming from the quay (off-frame left) along an
// arc onto the ship's decks. `state.prog` 0 → 1 drives the whole stream.
const PEOPLE_VERT = /* glsl */ `
  attribute vec3 ctrl;
  attribute vec3 dest;
  attribute float aDelay;
  attribute float aRand;
  uniform float uTime, uPR, uProg, uOpacity, uScale;
  uniform vec3 uOffset;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    float t = clamp((uProg * 1.3 - aDelay) / 0.3, 0.0, 1.0);
    t = 1.0 - (1.0 - t) * (1.0 - t);
    vec3 end = dest * uScale + uOffset;
    vec3 c = ctrl;
    vec3 p = mix(mix(position, c, t), mix(c, end, t), t);
    p.y += sin(uTime * 2.0 + aRand * 30.0) * 0.004 * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float flying = step(0.001, t) * (1.0 - step(0.999, t));
    gl_PointSize = (3.2 + aRand * 2.4 + flying * 1.6) * uPR * (10.0 / -mv.z);
    vCol = mix(vec3(1.0, 0.86, 0.6), vec3(0.95, 0.62, 0.25), aRand);
    vAlpha = uOpacity * step(0.001, t) * (0.75 + 0.25 * flying);
  }
`;

export function createPeople(stage, n = 1400) {
  const pos = new Float32Array(n * 3);
  const ctrl = new Float32Array(n * 3);
  const dest = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  const rand = new Float32Array(n);
  const deckLen = SHIP_DECKS.reduce((a, d) => a + (d.x1 - d.x0), 0);
  for (let i = 0; i < n; i++) {
    // Land on a deck, weighted by deck length.
    let r = Math.random() * deckLen;
    let deck = SHIP_DECKS[0];
    for (const d of SHIP_DECKS) {
      if (r < d.x1 - d.x0) {
        deck = d;
        break;
      }
      r -= d.x1 - d.x0;
    }
    const [dx, dy] = shipPx(deck.x0 + Math.random() * (deck.x1 - deck.x0), deck.y - 2 - Math.random() * 16);
    dest.set([dx, dy, (Math.random() - 0.5) * 0.25], i * 3);
    // Quay: off the left edge, at the waterline, spread in depth.
    pos.set([-8.2 - Math.random() * 1.5, WATERLINE + 0.1 + Math.random() * 0.15, 0.6 + Math.random() * 1.2], i * 3);
    ctrl.set([-4.6 + Math.random() * 1.2, 0.1 + Math.random() * 0.7, 0.4 + Math.random() * 0.6], i * 3);
    delay[i] = (i / n) * 0.96 + Math.random() * 0.04;
    rand[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('ctrl', new THREE.BufferAttribute(ctrl, 3));
  g.setAttribute('dest', new THREE.BufferAttribute(dest, 3));
  g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const uniforms = {
    uTime: stage.uniforms.uTime,
    uPR: stage.uniforms.uPR,
    uProg: { value: 0 },
    uOpacity: { value: 1 },
    uScale: { value: 1 },
    uOffset: { value: new THREE.Vector3() },
  };
  const pts = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      vertexShader: PEOPLE_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  stage.scene.add(pts);
  return { points: pts, uniforms, state: { prog: 0, opacity: 1 } };
}
