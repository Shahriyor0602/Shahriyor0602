import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { spline, clamp, DEG } from './util.js';
import { WHEELBASE, TRACK, WHEEL_R, STEERING_RATIO } from './timeline.js';

// A full-size four-door saloon (4.94 m × 1.87 m × 1.46 m, 2.95 m wheelbase),
// built procedurally. Car-local axes: +X = driver's left, +Y = up, +Z = forward.
// Origin: ground level, midway between the axles.

const Z_NOSE = 2.43;
const Z_TAIL = -2.51;
const Z_MID = (Z_NOSE + Z_TAIL) / 2;
const HALF_L = (Z_NOSE - Z_TAIL) / 2;
const FA = WHEELBASE / 2; // front axle z
const RA = -WHEELBASE / 2; // rear axle z
const HT = TRACK / 2; // half track

const topLine = spline([
  [-2.51, 0.86],
  [-2.47, 0.95],
  [-2.38, 1.0],
  [-2.1, 1.03],
  [-1.6, 1.035],
  [-1.35, 1.02],
  [-0.5, 0.99],
  [0.4, 0.975],
  [0.95, 0.955],
  [1.5, 0.92],
  [2.0, 0.885],
  [2.3, 0.835],
  [2.43, 0.745],
]);
const botLine = spline([
  [-2.51, 0.5],
  [-2.4, 0.38],
  [-2.1, 0.28],
  [-1.8, 0.225],
  [1.9, 0.205],
  [2.2, 0.245],
  [2.43, 0.32],
]);
const roofLine = spline([
  [-1.38, 1.022],
  [-1.2, 1.15],
  [-0.95, 1.345],
  [-0.6, 1.44],
  [-0.2, 1.455],
  [0.12, 1.41],
  [0.5, 1.2],
  [0.95, 0.955],
]);
const Z_GH0 = -1.38;
const Z_GH1 = 0.95;
const N_SEC = 5; // superellipse exponent for body sections

function planW(z) {
  const t = (z - Z_MID) / HALF_L;
  const p = t > 0 ? 5 : 6.5;
  return 0.935 * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(t)), p)), 1 / p);
}
// Rake the nose (upper face pulled back toward the hood, chin tucked) and tuck the boot lip.
function deform(p) {
  if (p.z > 1.7) {
    const k = THREE.MathUtils.smoothstep(p.z, 1.7, Z_NOSE);
    const up = THREE.MathUtils.smoothstep(p.y, 0.46, 0.8);
    const chin = 1 - THREE.MathUtils.smoothstep(p.y, 0.22, 0.34);
    p.z -= k * (0.1 * up + 0.05 * chin);
  } else if (p.z < -2.0) {
    const k = THREE.MathUtils.smoothstep(-p.z, 2.0, -Z_TAIL);
    p.z += k * 0.06 * THREE.MathUtils.smoothstep(p.y, 0.8, 1.02);
  }
  return p;
}
const sgnPow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);

// Point on the lower body at station z, section angle th (−π/2 bottom … π/2 top … 3π/2).
function bodyPoint(z, th, out) {
  const W = planW(z);
  const yt = topLine.at(z);
  const yb = botLine.at(z);
  const yc = (yt + yb) / 2;
  const hh = (yt - yb) / 2;
  const yn = sgnPow(Math.sin(th), 2 / N_SEC);
  let x = sgnPow(Math.cos(th), 2 / N_SEC) * W;
  x *= 1 - 0.055 * Math.max(0, -yn) ** 2 - 0.035 * Math.max(0, yn) ** 3;
  return out.set(x, yc + hh * yn, z);
}
// Half-width of the lower body at station z and height y.
export function bodyHalfWidth(z, y) {
  const yt = topLine.at(z);
  const yb = botLine.at(z);
  const hh = (yt - yb) / 2;
  const yn = clamp((y - (yt + yb) / 2) / hh, -1, 1);
  const s = Math.pow(Math.abs(yn), N_SEC / 2);
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return planW(z) * Math.pow(c, 2 / N_SEC) * (1 - 0.055 * Math.max(0, -yn) ** 2 - 0.035 * Math.max(0, yn) ** 3);
}
// z on the nose (end = 1) or tail (end = -1) where the half-width equals x at height y.
function endZ(x, y, end) {
  let lo = end > 0 ? 1.4 : Z_TAIL;
  let hi = end > 0 ? Z_NOSE : -1.4;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const w = bodyHalfWidth(m, y);
    if (end > 0) {
      if (w > x) lo = m;
      else hi = m;
    } else if (w > x) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
}
// Greenhouse surface: station z, angle th in [0, π] (0 = right side at belt, π/2 = roof centre).
function ghPoint(z, th, out, offset = 0) {
  const yb = topLine.at(z) - 0.004;
  const yr = Math.max(yb, roofLine.at(z));
  const Wb = planW(z) * 0.915;
  const Wr = Wb * 0.74;
  const n = 3.4;
  const xq = sgnPow(Math.cos(th), 2 / n);
  const yq = Math.pow(Math.abs(Math.sin(th)), 2 / n);
  const w = Wb + (Wr - Wb) * Math.pow(yq, 1.2);
  out.set(xq * w, yb + (yr - yb) * yq, z);
  if (offset) {
    out.x += Math.sign(xq) * offset * (1 - yq);
    out.y += offset * yq;
  }
  return out;
}

function gridGeometry(nu, nv, fn) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  const p = new THREE.Vector3();
  let k = 0;
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      fn(i / nu, j / nv, p);
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      uv[k * 2] = i / nu;
      uv[k * 2 + 1] = j / nv;
      k++;
    }
  const idx = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Orient a grid so its normals point away from `center` (for patches built with unknown winding).
function orientOutward(g, center = new THREE.Vector3(0, 0.7, 0)) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  let score = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 7) {
    a.fromBufferAttribute(p, i).sub(center);
    b.fromBufferAttribute(n, i);
    score += a.dot(b);
  }
  if (score < 0) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.computeVertexNormals();
  }
  return g;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
// X-ray paint: see-through at facing angles, solid at grazing angles, and
// reflections are kept visible even where the panel is transparent.
function xrayPaint({ arches = false, seams = false, color = 0x23272e, minA = 0.12, maxA = 0.9, cutaway = true } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nfloat gSeam;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        ${
          arches
            ? `{
          float dz = min(abs(vLocal.z - ${FA.toFixed(4)}), abs(vLocal.z - (${RA.toFixed(4)})));
          if (length(vec2((vLocal.y - ${WHEEL_R.toFixed(4)}) * 0.94, dz)) < 0.418 && abs(vLocal.x) > 0.52) discard;
        }`
            : ''
        }
        gSeam = 0.0;
        ${
          seams
            ? `{
          float side = step(0.62, abs(vLocal.x)) * step(0.26, vLocal.y) * step(vLocal.y, 0.965);
          float fw = fwidth(vLocal.z) * 1.5 + 0.0015;
          float s1 = 1.0 - smoothstep(0.0, fw, abs(vLocal.z - 0.84));
          float s2 = 1.0 - smoothstep(0.0, fw, abs(vLocal.z + 0.33));
          float s3 = 1.0 - smoothstep(0.0, fw, abs(vLocal.z + 1.27 + (vLocal.y - 0.6) * 0.25));
          gSeam = max(max(s1, s2), s3) * side;
          float hood = step(0.95, vLocal.z) * step(0.78, vLocal.y) * (1.0 - smoothstep(0.0, fwidth(vLocal.x) * 1.5 + 0.0015, abs(abs(vLocal.x) - 0.74)));
          float trunk = step(vLocal.z, -1.42) * step(0.9, vLocal.y) * (1.0 - smoothstep(0.0, fwidth(vLocal.x) * 1.5 + 0.0015, abs(abs(vLocal.x) - 0.7)));
          gSeam = max(gSeam, max(hood, trunk));
        }`
            : ''
        }`
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 V = normalize(vViewPosition);
          float fres = pow(1.0 - abs(dot(normalize(normal), V)), 2.2);
          float minA = ${minA.toFixed(3)};
          ${
            cutaway
              ? `float front = smoothstep(0.8, 1.15, vLocal.z);
          float rear = smoothstep(-1.15, -1.6, vLocal.z);
          float lower = smoothstep(0.66, 0.42, vLocal.y) * (1.0 - front);
          minA = mix(0.3, 0.09, front);
          minA = max(minA, 0.62 * lower);
          minA = mix(minA, 0.7, rear);`
              : ''
          }
          float a = mix(minA, ${maxA.toFixed(3)}, fres);
          vec3 spec = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
          float sl = dot(spec, vec3(0.299, 0.587, 0.114));
          a = max(a, clamp(sl * 1.6, 0.0, 0.85));
          a = max(a, gSeam * 0.8);
          outgoingLight *= 1.0 - 0.75 * gSeam;
          diffuseColor.a = a;
        }
        #include <opaque_fragment>`
      );
  };
  return m;
}

function glassMat() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x0b0f14,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.3,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        vec3 V = normalize(vViewPosition);
        float fres = pow(1.0 - abs(dot(normalize(normal), V)), 3.0);
        vec3 spec = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
        float sl = dot(spec, vec3(0.299, 0.587, 0.114));
        diffuseColor.a = clamp(max(mix(0.16, 0.7, fres), sl * 1.8), 0.0, 0.92);
      }
      #include <opaque_fragment>`
    );
  };
  return m;
}

// Holographic "running engine" glass for the powertrain casings.
function engineGlass(color = new THREE.Color(0.22, 0.52, 1.0), opacity = 0.2) {
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.35),
    metalness: 0.2,
    roughness: 0.25,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
const edgeLineMat = (color = 0x6fb7ff, opacity = 0.55) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });

function withEdges(mesh, lineMat, threshold = 30) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), lineMat);
  e.renderOrder = mesh.renderOrder + 1;
  mesh.add(e);
  return mesh;
}

// Rim face with procedural twin-spoke design and rotational motion blur.
function rimFaceMaterial() {
  const uni = { uBlur: { value: 0 } };
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.62, 0.63, 0.65),
    metalness: 1,
    roughness: 0.28,
    transparent: true,
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBlur = uni.uBlur;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRimUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRimUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vRimUv; uniform float uBlur;
        float spokeCov(float th, float rho) {
          if (rho < 0.072 || rho > 0.206) return 1.0;
          float seg = 6.2831853 / 5.0;
          float a = mod(th, seg) - seg * 0.5;
          float spread = 0.02 + 0.1 * smoothstep(0.08, 0.2, rho);
          float hw = 0.0105 / rho;
          float aa = 0.004 / rho;
          float s1 = 1.0 - smoothstep(hw - aa, hw + aa, abs(a - spread));
          float s2 = 1.0 - smoothstep(hw - aa, hw + aa, abs(a + spread));
          return max(s1, s2);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec2 c = (vRimUv - 0.5) * 2.0 * 0.232;
          float rho = length(c);
          float th = atan(c.y, c.x);
          float cov = 0.0;
          for (int i = 0; i < 12; i++) {
            float o = (float(i) / 11.0 - 0.5) * uBlur;
            cov += spokeCov(th + o, rho);
          }
          cov /= 12.0;
          diffuseColor.a *= cov;
          diffuseColor.rgb *= 0.7 + 0.45 * smoothstep(0.07, 0.22, rho);
          if (rho > 0.2 && rho < 0.206) diffuseColor.rgb *= 0.55;
        }`
      );
  };
  m.userData.uni = uni;
  return m;
}

// ---------------------------------------------------------------------------
export function buildCar() {
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  const sprung = new THREE.Group();
  root.add(sprung);

  const paint = xrayPaint({ arches: true, seams: true });
  const paintDetail = xrayPaint({ minA: 0.6, maxA: 0.95, cutaway: false });
  const glass = glassMat();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.12 });
  const blackGloss = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.3, roughness: 0.18 });
  const blackPlastic = new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.75, side: THREE.DoubleSide });
  const leather = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.62 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.42 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.88 });

  // --- Lower body -----------------------------------------------------------
  {
    const NZ = 150;
    const NT = 112;
    const zAt = (i) => Z_TAIL + (Z_NOSE - Z_TAIL) * (0.5 - 0.5 * Math.cos(Math.PI * i));
    const g = gridGeometry(NT, NZ, (a, b, p) => deform(bodyPoint(zAt(b), -Math.PI / 2 + a * Math.PI * 2, p)));
    orientOutward(g);
    const body = new THREE.Mesh(g, paint);
    body.renderOrder = 4;
    body.castShadow = true;
    sprung.add(body);
  }

  // --- Greenhouse: glass + painted roof and pillars -------------------------
  {
    const zAt = (b) => Z_GH0 + (Z_GH1 - Z_GH0) * b;
    const g = gridGeometry(64, 80, (a, b, p) => ghPoint(zAt(b), a * Math.PI, p));
    orientOutward(g);
    const gh = new THREE.Mesh(g, glass);
    gh.renderOrder = 5;
    gh.castShadow = true;
    sprung.add(gh);

    const patch = (z0, z1, t0, t1, mat, nu = 24, nv = 24) => {
      const pg = gridGeometry(nu, nv, (a, b, p) => ghPoint(z0 + (z1 - z0) * b, t0 + (t1 - t0) * a, p, 0.004));
      orientOutward(pg);
      const m = new THREE.Mesh(pg, mat);
      m.renderOrder = 6;
      sprung.add(m);
      return m;
    };
    const PA = 0.64;
    patch(-1.0, 0.2, PA, Math.PI - PA, paintDetail, 32, 30); // roof
    for (const s of [0, 1]) {
      const t0 = s ? Math.PI - PA - 0.26 : PA;
      const t1 = s ? Math.PI - PA : PA + 0.26;
      // A-pillars
      const ta = s ? Math.PI - PA - 0.1 : PA - 0.02;
      const tb = s ? Math.PI - PA + 0.02 : PA + 0.1;
      patch(0.12, 0.95, ta, tb, paintDetail, 6, 30);
      // B-pillar and C-pillar
      const tc0 = s ? Math.PI - PA - 0.02 : 0;
      const tc1 = s ? Math.PI : PA + 0.02;
      patch(-0.42, -0.29, tc0, tc1, paintDetail, 12, 4);
      patch(-1.38, -0.93, tc0, tc1, paintDetail, 12, 16);
      // chrome belt line
      const tl0 = s ? Math.PI - 0.035 : 0;
      const tl1 = s ? Math.PI : 0.035;
      patch(-1.3, 0.9, tl0, tl1, chrome, 2, 40);
      void t0;
      void t1;
    }
  }

  // --- Lights, grille, trim --------------------------------------------------
  const drlMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(1, 0.97, 0.92), emissiveIntensity: 14 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: new THREE.Color(1, 0.0, 0.004), emissiveIntensity: 2.4 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, metalness: 0.6, roughness: 0.08, clearcoat: 1 });
  function sideStrip(zFrom, yTop, yBot, xMin, mat, end, off = 0.005, nz = 40) {
    // Strip on the lower body wrapping from the side onto the nose/tail face.
    const zEnd = end > 0 ? endZ(xMin, (yTop(zFrom) + yBot(zFrom)) / 2, 1) : endZ(xMin, (yTop(zFrom) + yBot(zFrom)) / 2, -1);
    const g = gridGeometry(nz, 3, (a, b, p) => {
      const t = 1 - (1 - a) * (1 - a);
      const z = zFrom + (zEnd - zFrom) * t;
      const y = yBot(z) + (yTop(z) - yBot(z)) * b;
      const x = bodyHalfWidth(z, y) + off;
      deform(p.set(x, y, z));
    });
    orientOutward(g, new THREE.Vector3(0, 0.6, 0));
    const m1 = new THREE.Mesh(g, mat);
    const m2 = new THREE.Mesh(g.clone().scale(-1, 1, 1), mat);
    orientOutward(m2.geometry, new THREE.Vector3(0, 0.6, 0));
    sprung.add(m1, m2);
  }
  // Headlight lens and DRL signature
  sideStrip(2.12, (z) => topLine.at(z) - 0.028, (z) => topLine.at(z) - 0.1, 0.44, lensMat, 1);
  sideStrip(2.15, (z) => topLine.at(z) - 0.034, (z) => topLine.at(z) - 0.047, 0.47, drlMat, 1, 0.008);
  // Tail lights
  sideStrip(-2.18, (z) => topLine.at(z) - 0.055, (z) => topLine.at(z) - 0.12, 0.3, tailMat, -1, 0.006);
  {
    // Full-width rear light bar
    const g = gridGeometry(60, 1, (a, b, p) => {
      const x = (a - 0.5) * 0.66;
      const y = 0.905 + b * 0.018;
      deform(p.set(x, y, endZ(Math.abs(x) + 1e-4, y, -1) - 0.006));
    });
    orientOutward(g, new THREE.Vector3(0, 0.9, 0));
    sprung.add(new THREE.Mesh(g, tailMat));
  }
  function facePatch(x0, x1, y0, y1, mat, end, off) {
    const g = gridGeometry(30, 8, (a, b, p) => {
      const x = x0 + (x1 - x0) * a;
      const y = y0 + (y1 - y0) * b;
      deform(p.set(x, y, endZ(Math.abs(x) + 1e-4, y, end) + off * end));
    });
    orientOutward(g, new THREE.Vector3(0, 0.5, 0));
    const m = new THREE.Mesh(g, mat);
    sprung.add(m);
    return m;
  }
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x050607, metalness: 0.4, roughness: 0.35 });
  grilleMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGUv;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat sl = step(0.78, fract(vGUv.y * 11.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1), sl);'
      );
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGUv = uv;');
  };
  facePatch(-0.37, 0.37, 0.37, 0.54, grilleMat, 1, 0.004);
  facePatch(-0.6, 0.6, 0.265, 0.325, blackGloss, 1, 0.004);
  facePatch(-0.55, 0.55, 0.42, 0.5, blackGloss, -1, 0.004); // rear diffuser/plate recess

  // Mirrors
  for (const s of [1, -1]) {
    const m = new THREE.Group();
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.1, 0.08, 3, 0.035), paintDetail);
    housing.rotation.y = s * 0.12;
    housing.renderOrder = 6;
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.06), paintDetail);
    stalk.position.set(-s * 0.07, -0.02, 0.01);
    m.add(housing, stalk);
    m.position.set(s * 0.99, 1.02, 0.66);
    sprung.add(m);
  }
  // Door handles
  for (const s of [1, -1])
    for (const z of [0.28, -0.72]) {
      const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.11, 4, 8), chrome);
      h.rotation.x = Math.PI / 2;
      h.position.set(s * (bodyHalfWidth(z, 0.88) + 0.008), 0.88, z);
      sprung.add(h);
    }
  // Exhaust tips
  for (const s of [1, -1]) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 20, 1, true), darkMetal);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(s * 0.48, 0.3, -2.42);
    sprung.add(tip);
  }
  // Wheel-arch liners
  for (const z of [FA, RA])
    for (const s of [1, -1]) {
      const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.418, 0.418, 0.27, 32, 1, true, 0, Math.PI), blackPlastic);
      liner.rotation.z = Math.PI / 2;
      liner.rotation.x = 0;
      liner.position.set(s * 0.73, WHEEL_R, z);
      liner.rotateX(0);
      sprung.add(liner);
    }

  // --- Interior -------------------------------------------------------------
  {
    const dash = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.2, 0.4, 3, 0.06), leather);
    dash.position.set(0, 0.84, 0.72);
    sprung.add(dash);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(0.25, 0.5, 0.9), emissiveIntensity: 0.9 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), screenMat);
    screen.position.set(-0.02, 0.99, 0.56);
    screen.rotation.x = -0.35;
    screen.rotation.y = Math.PI;
    sprung.add(screen);
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), screenMat);
    cluster.position.set(0.37, 0.975, 0.58);
    cluster.rotation.set(-0.3, Math.PI, 0);
    sprung.add(cluster);
    const console_ = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.22, 1.1, 3, 0.05), leather);
    console_.position.set(0, 0.42, 0.05);
    sprung.add(console_);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 2.6), blackPlastic);
    floor.position.set(0, 0.26, -0.3);
    sprung.add(floor);
    const seat = (x, z, w) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.13, 0.52, 3, 0.05), leather);
      base.position.y = 0.44;
      const back = new THREE.Mesh(new RoundedBoxGeometry(w * 0.96, 0.66, 0.13, 3, 0.05), leather);
      back.position.set(0, 0.8, -0.27);
      back.rotation.x = -0.24;
      g.add(base, back);
      if (w < 0.7) {
        const head = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.17, 0.1, 3, 0.04), leather);
        head.position.set(0, 1.2, -0.37);
        head.rotation.x = -0.2;
        g.add(head);
      }
      g.position.set(x, 0, z);
      sprung.add(g);
    };
    seat(0.37, -0.12, 0.52);
    seat(-0.37, -0.12, 0.52);
    seat(0, -1.08, 1.34);
  }

  // --- Powertrain (effectiveness) --------------------------------------------
  const engine = new THREE.Group();
  sprung.add(engine);
  const eg = engineGlass();
  const eEdge = edgeLineMat(0x7cc4ff, 0.6);
  const eMeshes = [];
  const addGlass = (geo, x, y, z, mat = eg) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.renderOrder = 2;
    withEdges(m, eEdge, 25);
    engine.add(m);
    eMeshes.push(m);
    return m;
  };
  const E_Z = 1.42;
  addGlass(new RoundedBoxGeometry(0.4, 0.34, 0.94, 2, 0.03), 0, 0.58, E_Z); // block
  addGlass(new RoundedBoxGeometry(0.28, 0.1, 0.5, 2, 0.03), 0, 0.36, E_Z + 0.2); // sump
  addGlass(new RoundedBoxGeometry(0.36, 0.08, 0.9, 2, 0.02), 0, 0.79, E_Z); // head
  addGlass(new RoundedBoxGeometry(0.29, 0.06, 0.84, 2, 0.025), 0, 0.86, E_Z); // cam cover
  // Transmission + tail housing
  {
    const bell = new THREE.CylinderGeometry(0.2, 0.13, 0.62, 24, 1);
    bell.rotateX(Math.PI / 2);
    addGlass(bell, 0, 0.5, 0.64);
    const tail = new THREE.CylinderGeometry(0.1, 0.07, 0.4, 16, 1);
    tail.rotateX(Math.PI / 2);
    addGlass(tail, 0, 0.44, 0.13);
  }
  // Internals: crank, rods, pistons, cams (solid, bright)
  const pistonMat = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.2, emissive: new THREE.Color(0.1, 0.3, 0.7), emissiveIntensity: 0.4 });
  const CRANK_Y = 0.47;
  const THROW = 0.045;
  const ROD = 0.13;
  const cyls = [];
  const crank = new THREE.Group();
  crank.position.set(0, CRANK_Y, E_Z);
  engine.add(crank);
  {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.96, 12), metal);
    shaft.rotation.x = Math.PI / 2;
    crank.add(shaft);
  }
  const CYL_Z = [0, 1, 2, 3, 4, 5].map((i) => E_Z - 0.375 + i * 0.15);
  const PHASE = [0, 240, 120, 120, 240, 0].map((d) => d * DEG); // inline-6 crank throws
  const FIRE = [0, 480, 240, 600, 120, 360].map((d) => d * DEG); // firing order 1-5-3-6-2-4
  const flashMat = [];
  for (let i = 0; i < 6; i++) {
    const web = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.022), darkMetal);
    const throwG = new THREE.Group();
    throwG.position.z = CYL_Z[i] - E_Z;
    throwG.rotation.z = PHASE[i];
    web.position.y = 0.02;
    throwG.add(web);
    crank.add(throwG);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.05, 20), pistonMat);
    engine.add(piston);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.016, ROD, 0.014), metal);
    rod.geometry.translate(0, ROD / 2, 0);
    engine.add(rod);
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.5, 2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const flash = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), fm);
    flash.rotation.x = -Math.PI / 2;
    flash.renderOrder = 3;
    engine.add(flash);
    flashMat.push(fm);
    cyls.push({ piston, rod, flash, z: CYL_Z[i], phase: PHASE[i], fire: FIRE[i] });
  }
  const cams = [];
  for (const x of [0.065, -0.065]) {
    const cam = new THREE.Group();
    cam.position.set(x, 0.82, E_Z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.86, 10), metal);
    shaft.rotation.x = Math.PI / 2;
    cam.add(shaft);
    for (let i = 0; i < 12; i++) {
      const lobe = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.036, 0.016), metal);
      lobe.position.set(0, 0.01, -0.4 + i * 0.07);
      const lg = new THREE.Group();
      lg.rotation.z = i * 1.3;
      lg.add(lobe);
      cam.add(lg);
    }
    engine.add(cam);
    cams.push(cam);
  }
  // Front accessory drive
  const pulleys = [];
  const pulley = (x, y, r) => {
    const g = new THREE.Group();
    g.position.set(x, y, E_Z + 0.5);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.028, 28), metal);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    for (let k = 0; k < 3; k++) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.032, 12), darkMetal);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos((k * Math.PI * 2) / 3) * r * 0.55, Math.sin((k * Math.PI * 2) / 3) * r * 0.55, 0);
      g.add(hole);
    }
    engine.add(g);
    pulleys.push({ g, ratio: 0.085 / r });
    return g;
  };
  pulley(0, CRANK_Y, 0.085);
  pulley(0, 0.67, 0.06);
  pulley(0.16, 0.75, 0.045);
  pulley(-0.13, 0.6, 0.036);
  {
    const pts = [
      [0.085, CRANK_Y],
      [0.2, 0.74],
      [0.16, 0.8],
      [0.02, 0.73],
      [-0.06, 0.68],
      [-0.165, 0.6],
      [-0.08, CRANK_Y - 0.06],
    ].map(([x, y]) => new THREE.Vector3(x, y, E_Z + 0.5));
    const belt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.006, 6, true), rubber);
    engine.add(belt);
  }
  // Radiator + fan
  {
    const rad = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.36, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x1c2128, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.5, depthWrite: false })
    );
    rad.renderOrder = 2;
    rad.position.set(0, 0.54, 2.12);
    engine.add(rad);
  }
  const fan = new THREE.Group();
  fan.position.set(0, 0.6, 2.08);
  {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), darkMetal);
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);
    for (let k = 0; k < 7; k++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.008), darkMetal);
      blade.position.y = 0.1;
      blade.rotation.y = 0.5;
      const bg = new THREE.Group();
      bg.rotation.z = (k * Math.PI * 2) / 7;
      bg.add(blade);
      fan.add(bg);
    }
    const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 8, 48), darkMetal);
    fan.add(shroud);
  }
  engine.add(fan);
  // Intake runners + plenum (driver's left), exhaust manifold (right)
  {
    const alu = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.85, roughness: 0.35 });
    const plenum = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.86, 2, 0.04), alu);
    plenum.position.set(0.3, 0.8, E_Z);
    engine.add(plenum);
    const exh = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, metalness: 0.8, roughness: 0.45, emissive: new THREE.Color(0.35, 0.12, 0.03), emissiveIntensity: 0.25 });
    for (const z of CYL_Z) {
      const inR = new THREE.CatmullRomCurve3([new THREE.Vector3(0.17, 0.78, z), new THREE.Vector3(0.25, 0.86, z), new THREE.Vector3(0.3, 0.8, z)]);
      engine.add(new THREE.Mesh(new THREE.TubeGeometry(inR, 10, 0.017, 8), alu));
      const exR = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.18, 0.74, z),
        new THREE.Vector3(-0.27, 0.66, z),
        new THREE.Vector3(-0.28, 0.46, (z + E_Z - 0.35) / 2),
        new THREE.Vector3(-0.26, 0.34, E_Z - 0.45),
      ]);
      engine.add(new THREE.Mesh(new THREE.TubeGeometry(exR, 16, 0.018, 8), exh));
    }
    const pipe = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.26, 0.34, E_Z - 0.45),
      new THREE.Vector3(-0.24, 0.26, 0.5),
      new THREE.Vector3(-0.22, 0.25, -1.0),
      new THREE.Vector3(-0.35, 0.28, -2.0),
      new THREE.Vector3(-0.48, 0.3, -2.38),
    ]);
    sprung.add(new THREE.Mesh(new THREE.TubeGeometry(pipe, 60, 0.03, 10), darkMetal));
    const pipe2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.25, -1.6),
      new THREE.Vector3(0.1, 0.27, -1.95),
      new THREE.Vector3(0.48, 0.3, -2.38),
    ]);
    sprung.add(new THREE.Mesh(new THREE.TubeGeometry(pipe2, 30, 0.028, 10), darkMetal));
  }
  // Driveshaft, differential, half-shafts
  const driveshaft = new THREE.Group();
  {
    const a = new THREE.Vector3(0, 0.42, -0.08);
    const b = new THREE.Vector3(0, WHEEL_R + 0.02, RA + 0.14);
    const len = a.distanceTo(b);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, len, 16), metal);
    shaft.rotation.x = Math.PI / 2;
    driveshaft.add(shaft);
    for (const t of [-0.5, 0, 0.5]) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.035), darkMetal);
      joint.position.z = t * len;
      driveshaft.add(joint);
    }
    driveshaft.position.copy(a).add(b).multiplyScalar(0.5);
    driveshaft.lookAt(driveshaft.position.clone().add(new THREE.Vector3().subVectors(a, b)));
    sprung.add(driveshaft);
    const diff = addGlass(new THREE.SphereGeometry(0.13, 20, 14), 0, WHEEL_R + 0.02, RA);
    diff.scale.set(1.15, 0.95, 1);
    for (const s of [1, -1]) {
      const hs = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, HT - 0.18, 10), metal);
      hs.rotation.z = Math.PI / 2;
      hs.position.set(s * (0.09 + (HT - 0.18) / 2), WHEEL_R, RA);
      sprung.add(hs);
    }
  }

  // --- Steering (efficiency) ------------------------------------------------
  const steerMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.5, metalness: 0.2 });
  const SW_C = new THREE.Vector3(0.37, 0.95, 0.36);
  const colDir = new THREE.Vector3(0, -0.42, 0.91).normalize();
  const swMount = new THREE.Group();
  swMount.position.copy(SW_C);
  swMount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), colDir);
  sprung.add(swMount);
  const wheelSpin = new THREE.Group();
  swMount.add(wheelSpin);
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.018, 14, 72), steerMat);
    wheelSpin.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.06, 24), steerMat);
    hub.rotation.x = Math.PI / 2;
    wheelSpin.add(hub);
    for (const a of [0, (2 * Math.PI) / 3 + 0.5, (4 * Math.PI) / 3 - 0.5]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.014), steerMat);
      sp.position.set(Math.cos(a - Math.PI / 2) * 0.12, Math.sin(a - Math.PI / 2) * 0.12, 0);
      sp.rotation.z = a - Math.PI / 2;
      wheelSpin.add(sp);
    }
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.04), chrome);
    marker.position.set(0, 0.185, 0);
    wheelSpin.add(marker);
  }
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.6, 1.5), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.0045, 8, 96), glowMat);
  glowRing.renderOrder = 7;
  wheelSpin.add(glowRing);

  // Column → U-joint → intermediate shaft → pinion on the rack.
  const firewall = SW_C.clone().addScaledVector(colDir, 0.5);
  const pinion = new THREE.Vector3(0.34, 0.34, 1.29);
  const shaftBetween = (a, b, r, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 12), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
    return m;
  };
  const steerLinkMat = new THREE.MeshStandardMaterial({ color: 0x3ad29f, metalness: 0.6, roughness: 0.35, emissive: new THREE.Color(0.05, 0.4, 0.25), emissiveIntensity: 0.6 });
  sprung.add(shaftBetween(SW_C.clone().addScaledVector(colDir, 0.04), firewall, 0.02, steerLinkMat));
  sprung.add(shaftBetween(firewall, pinion, 0.016, steerLinkMat));
  const joints = [];
  for (const p of [firewall, pinion]) {
    const j = new THREE.Group();
    j.position.copy(p);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.02), darkMetal);
    j.add(yoke);
    sprung.add(j);
    joints.push(j);
  }
  const RACK_Y = 0.34;
  const RACK_Z = 1.29;
  const RACK_HALF = 0.46;
  {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, RACK_HALF * 2, 16), steerLinkMat);
    housing.rotation.z = Math.PI / 2;
    housing.position.set(0, RACK_Y, RACK_Z);
    sprung.add(housing);
  }
  const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, RACK_HALF * 2 + 0.2, 10), metal);
  rackBar.rotation.z = Math.PI / 2;
  rackBar.position.set(0, RACK_Y, RACK_Z);
  sprung.add(rackBar);
  const tieRods = [1, -1].map(() => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 8), steerLinkMat);
    sprung.add(m);
    return m;
  });
  const ARM = 0.17;
  const KP_X = HT - 0.09;

  // --- Suspension -----------------------------------------------------------
  const springMat = new THREE.MeshStandardMaterial({ color: 0x2f7fd8, metalness: 0.5, roughness: 0.4 });
  for (const z of [FA, RA])
    for (const s of [1, -1]) {
      const x = s * (HT - 0.2);
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2 * 6;
        pts.push(new THREE.Vector3(x + Math.cos(a) * 0.055, 0.44 + (i / 120) * 0.3, z - 0.02 + Math.sin(a) * 0.055));
      }
      sprung.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.008, 6), springMat));
      sprung.add(shaftBetween(new THREE.Vector3(x, WHEEL_R + 0.05, z), new THREE.Vector3(x, 0.8, z - 0.02), 0.018, darkMetal));
      sprung.add(shaftBetween(new THREE.Vector3(s * (HT - 0.12), WHEEL_R - 0.08, z), new THREE.Vector3(s * 0.3, 0.26, z + 0.22), 0.014, darkMetal));
      sprung.add(shaftBetween(new THREE.Vector3(s * (HT - 0.12), WHEEL_R - 0.08, z), new THREE.Vector3(s * 0.3, 0.26, z - 0.2), 0.014, darkMetal));
    }

  // --- Wheels ---------------------------------------------------------------
  const tireGeo = (() => {
    const prof = [
      [0.232, -0.112],
      [0.29, -0.121],
      [0.325, -0.115],
      [0.34, -0.1],
      [0.345, -0.085],
      [0.345, -0.05],
      [0.339, -0.045],
      [0.339, -0.035],
      [0.345, -0.03],
      [0.345, 0.03],
      [0.339, 0.035],
      [0.339, 0.045],
      [0.345, 0.05],
      [0.345, 0.085],
      [0.34, 0.1],
      [0.325, 0.115],
      [0.29, 0.121],
      [0.232, 0.112],
    ].map(([r, x]) => new THREE.Vector2(r, x));
    const g = new THREE.LatheGeometry(prof, 72);
    g.rotateZ(-Math.PI / 2); // lathe axis Y → X
    return g;
  })();
  const barrelGeo = new THREE.CylinderGeometry(0.229, 0.229, 0.22, 48, 1, true);
  barrelGeo.rotateZ(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.172, 0.172, 0.026, 40);
  discGeo.rotateZ(Math.PI / 2);
  const rimFaceGeo = new THREE.CircleGeometry(0.232, 72);
  rimFaceGeo.rotateY(Math.PI / 2); // face +X
  const capGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24);
  capGeo.rotateZ(Math.PI / 2);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x5a5e64, metalness: 0.9, roughness: 0.45, side: THREE.DoubleSide });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.9, roughness: 0.4 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0x2b3037, metalness: 0.5, roughness: 0.35 });
  const wheels = [];
  for (const [side, z, front] of [
    [1, FA, true],
    [-1, FA, true],
    [1, RA, false],
    [-1, RA, false],
  ]) {
    const mount = new THREE.Group(); // positioned at the hub
    mount.position.set(side * HT, WHEEL_R, z);
    root.add(mount);
    const steer = new THREE.Group();
    mount.add(steer);
    const flip = new THREE.Group(); // mirror for right side so the face points outward
    if (side < 0) flip.rotation.y = Math.PI;
    steer.add(flip);
    const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.13, 0.085, 2, 0.015), caliperMat);
    caliper.position.set(0.02, 0.12, -0.08);
    caliper.rotation.x = 0.55;
    flip.add(caliper);
    const spin = new THREE.Group();
    flip.add(spin);
    const tire = new THREE.Mesh(tireGeo, rubber);
    tire.castShadow = true;
    spin.add(tire);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    spin.add(barrel);
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.x = -0.02;
    spin.add(disc);
    const rimMat = rimFaceMaterial();
    const face = new THREE.Mesh(rimFaceGeo, rimMat);
    face.position.x = 0.085;
    face.renderOrder = 1;
    spin.add(face);
    const cap = new THREE.Mesh(capGeo, darkMetal);
    cap.position.x = 0.09;
    spin.add(cap);
    wheels.push({ mount, steer, spin, side, front, rimMat });
  }

  // Label anchors (sprung-local)
  const anchors = {
    engine: new THREE.Object3D(),
    steering: new THREE.Object3D(),
  };
  anchors.engine.position.set(0.05, 0.86, E_Z + 0.12);
  anchors.steering.position.copy(SW_C).add(new THREE.Vector3(0, 0.12, 0));
  sprung.add(anchors.engine, anchors.steering);

  // ---------------------------------------------------------------------------
  function update(st) {
    root.matrix.copy(st.pose.matrix);
    root.matrixWorldNeedsUpdate = true;

    sprung.position.set(0, st.susp.bounce, 0);
    sprung.rotation.set(st.susp.pitch, 0, st.susp.roll);

    // Steering linkage
    const d = st.steer;
    wheelSpin.rotation.z = -d * STEERING_RATIO * 1.0;
    for (const j of joints) j.rotation.z = -d * STEERING_RATIO;
    const shift = -ARM * Math.sin(d);
    rackBar.position.x = shift;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      const a = new THREE.Vector3(s * (RACK_HALF + 0.08) + shift, RACK_Y, RACK_Z);
      const b = new THREE.Vector3(s * KP_X - ARM * Math.sin(d), RACK_Y, FA - ARM * Math.cos(d));
      const tr = tieRods[i];
      tr.position.copy(a).add(b).multiplyScalar(0.5);
      tr.scale.set(1, a.distanceTo(b), 1);
      tr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    }
    glowMat.opacity = 0.55 + 0.25 * st.glow;

    for (const w of wheels) {
      w.steer.rotation.y = w.front ? d : 0;
      const ang = w.front ? st.frontSpin : st.rearSpin;
      w.spin.rotation.x = w.side > 0 ? ang : -ang;
      const rate = w.front ? st.frontRate : st.rearRate;
      w.rimMat.userData.uni.uBlur.value = Math.min(2.4, rate * st.shutter);
    }

    // Engine
    const c = st.crank;
    crank.rotation.z = c;
    for (const cy of cyls) {
      const th = c + cy.phase;
      const px = THROW * Math.sin(th);
      const py = THROW * Math.cos(th);
      const pinY = CRANK_Y + py + Math.sqrt(ROD * ROD - px * px);
      cy.piston.position.set(0, pinY + 0.02, cy.z);
      cy.rod.position.set(px, CRANK_Y + py, cy.z);
      cy.rod.rotation.z = Math.atan2(px, pinY - (CRANK_Y + py));
      cy.flash.position.set(0, pinY + 0.047, cy.z);
      let ph = (c - cy.fire) % (Math.PI * 4);
      if (ph < 0) ph += Math.PI * 4;
      const flash = Math.exp(-Math.pow(ph / 0.55, 2)) + Math.exp(-Math.pow((ph - Math.PI * 4) / 0.55, 2));
      cy.flash.material.opacity = flash * 0.75;
    }
    for (const cam of cams) cam.rotation.z = c * 0.5;
    for (const p of pulleys) p.g.rotation.z = -c * p.ratio;
    fan.rotation.z = -c * 1.15;
    engine.position.set(0, -0.03 + 0.0006 * Math.sin(c * 3), 0);
    engine.rotation.z = 0.0025 * Math.sin(c * 2);
    eg.emissiveIntensity = 0.9 + 0.25 * st.glow;
  }

  return { root, sprung, anchors, update };
}
