import * as THREE from 'three';
import { makeRoadMaterial } from './roadMaterial.js';
import { rng, clamp, smoothstep, noise1 } from './util.js';
import { WATER_Y, SUN_DIR } from './environment.js';
import {
  damage,
  zoneCrack,
  tremor,
  plateMatrix,
  hingeDist,
  gapLen,
  HINGE_U,
  HINGE_V,
  HINGE_SKEW,
  PLATE_W,
  ZONE_V0,
  ZONE_V1,
  COLLAPSE_ORIGIN,
  COLLAPSE_SPEED,
  T_COLLAPSE,
  LANE_U,
} from './timeline.js';

// Elevated coastal highway deck. Continuous everywhere except a pre-fractured
// zone of Voronoi slabs that crack, hinge and fall away on cue.
const HALF = 5.0; // deck half-width
const THICK = 0.9; // deck thickness
const V_START = -160;
const V_END = 2400;
const G = 9.81;

const CRACK = 0;
const OUTER = 1;

export function buildRoad(scene, path, carPoseAt) {
  const uniforms = {
    uDamage: { value: 0 },
    uZoneCrack: { value: 0 },
    uZoneV0: { value: ZONE_V0 },
    uZoneV1: { value: ZONE_V1 },
  };
  const roadMat = makeRoadMaterial(uniforms);
  const concreteMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.41, 0.39), roughness: 0.93 });
  const brokenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.15, 0.145, 0.135), roughness: 1.0 });
  brokenMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj;
        float bh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float bn(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float n = bn(vObj * 3.0) * 0.6 + bn(vObj * 11.0) * 0.4;
        float speck = step(0.83, bn(vObj * 38.0));
        diffuseColor.rgb *= (0.6 + 0.6 * n) * (1.0 - 0.35 * speck);
        diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(-0.9, -0.05, vObj.y));`
      );
  };
  const steelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.58, 0.6, 0.62),
    metalness: 0.6,
    roughness: 0.52,
    side: THREE.DoubleSide,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.44, 0.46), metalness: 0.5, roughness: 0.6 });
  const group = new THREE.Group();
  scene.add(group);
  const tmpV = new THREE.Vector3();
  const f = {};

  // ---------------------------------------------------------------------------
  // Continuous deck ribbons
  // ---------------------------------------------------------------------------
  function ribbon(v0, v1) {
    const rows = Math.ceil(v1 - v0) + 1;
    const cols = 21;
    const pos = [];
    const nrm = [];
    const ruv = [];
    const edg = [];
    const idx = [];
    for (let r = 0; r < rows; r++) {
      const v = Math.min(v1, v0 + r);
      path.frame(v, f);
      for (let c = 0; c < cols; c++) {
        const u = -HALF + (c / (cols - 1)) * 2 * HALF;
        pos.push(f.pos.x + f.right.x * u, 0, f.pos.z + f.right.z * u);
        nrm.push(0, 1, 0);
        ruv.push(u, v);
        edg.push(10);
      }
    }
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    const top = new THREE.BufferGeometry();
    top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    top.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    top.setAttribute('roadUV', new THREE.Float32BufferAttribute(ruv, 2));
    top.setAttribute('edgeDist', new THREE.Float32BufferAttribute(edg, 1));
    top.setIndex(idx);
    fixWinding(top);
    const topMesh = new THREE.Mesh(top, roadMat);
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Sides and underside.
    const sp = [];
    const sIdx = [];
    const ring = [
      [HALF, 0],
      [HALF, -THICK],
      [-HALF, -THICK],
      [-HALF, 0],
    ];
    for (let r = 0; r < rows; r++) {
      const v = Math.min(v1, v0 + r);
      path.frame(v, f);
      for (const [u, y] of ring) sp.push(f.pos.x + f.right.x * u, y, f.pos.z + f.right.z * u);
    }
    for (let r = 0; r < rows - 1; r++)
      for (let k = 0; k < 3; k++) {
        const a = r * 4 + k;
        const b = a + 1;
        const d = a + 4;
        const e = d + 1;
        sIdx.push(a, b, d, b, e, d);
      }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    shell.setIndex(sIdx);
    shell.computeVertexNormals();
    const shellMesh = new THREE.Mesh(shell, new THREE.MeshStandardMaterial({ color: 0x77736d, roughness: 0.92, side: THREE.DoubleSide }));
    group.add(shellMesh);

    railsAlong(v0, v1);
  }

  // W-beam guardrail profile (depth toward the road, height).
  const PROFILE = [
    [0.0, 0.46],
    [0.065, 0.5],
    [0.07, 0.565],
    [0.02, 0.61],
    [0.07, 0.655],
    [0.065, 0.72],
    [0.0, 0.76],
  ];
  const RAIL_U = 4.8;
  function railGeometry(side, v0, v1, origin) {
    const pos = [];
    const idx = [];
    const n = Math.max(2, Math.ceil((v1 - v0) / 0.5) + 1);
    const inward = -side;
    for (let i = 0; i < n; i++) {
      const v = v0 + ((v1 - v0) * i) / (n - 1);
      path.frame(v, f);
      for (const [d, h] of PROFILE) {
        const u = side * RAIL_U + inward * d;
        pos.push(f.pos.x + f.right.x * u - origin.x, h - origin.y, f.pos.z + f.right.z * u - origin.z);
      }
    }
    const m = PROFILE.length;
    for (let i = 0; i < n - 1; i++)
      for (let k = 0; k < m - 1; k++) {
        const a = i * m + k;
        idx.push(a, a + m, a + 1, a + 1, a + m, a + m + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const postGeo = new THREE.BoxGeometry(0.1, 0.78, 0.13);
  postGeo.translate(0, 0.39, 0);
  const postMatrices = [];
  function railsAlong(v0, v1) {
    for (const side of [-1, 1]) {
      const g = railGeometry(side, v0, v1, new THREE.Vector3());
      const m = new THREE.Mesh(g, steelMat);
      m.castShadow = true;
      group.add(m);
      for (let v = Math.ceil(v0 / 2) * 2; v <= v1; v += 2) {
        path.frame(v, f);
        const p = path.world(side * (RAIL_U + 0.1), v, 0, tmpV);
        const mat = new THREE.Matrix4().makeRotationY(f.yaw).setPosition(p);
        postMatrices.push(mat);
      }
    }
  }

  ribbon(V_START, ZONE_V0);
  ribbon(ZONE_V1, V_END);
  const posts = new THREE.InstancedMesh(postGeo, postMat, postMatrices.length);
  postMatrices.forEach((m, i) => posts.setMatrixAt(i, m));
  posts.castShadow = true;
  group.add(posts);

  // ---------------------------------------------------------------------------
  // Pillars and cap beams under the deck
  // ---------------------------------------------------------------------------
  {
    const capGeo = new THREE.BoxGeometry(10.8, 1.1, 1.9);
    const colGeo = new THREE.CylinderGeometry(0.75, 0.85, 1, 24);
    colGeo.translate(0, -0.5, 0);
    const caps = [];
    const cols = [];
    for (let v = 12; v < V_END; v += 42) {
      if (v > ZONE_V0 - 10 && v < ZONE_V1 + 10) continue;
      path.frame(v, f);
      const rot = new THREE.Matrix4().makeRotationY(f.yaw);
      const cp = path.world(0, v, -THICK - 0.55);
      caps.push(rot.clone().setPosition(cp));
      for (const u of [-3.2, 3.2]) {
        const p = path.world(u, v, -THICK - 1.1);
        const h = p.y - (WATER_Y - 2);
        cols.push(new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
      }
    }
    const capMesh = new THREE.InstancedMesh(capGeo, concreteMat, caps.length);
    caps.forEach((m, i) => capMesh.setMatrixAt(i, m));
    const colMesh = new THREE.InstancedMesh(colGeo, concreteMat, cols.length);
    cols.forEach((m, i) => colMesh.setMatrixAt(i, m));
    group.add(capMesh, colMesh);
  }

  // ---------------------------------------------------------------------------
  // Collapse zone: Voronoi slabs
  // ---------------------------------------------------------------------------
  const R = rng(20240611);
  const sites = [];
  for (let v = ZONE_V0 + 0.4; v < ZONE_V1; v += 1.3) {
    for (let u = -HALF + 0.5; u < HALF; u += 1.2) {
      const su = u + (R() - 0.5) * 0.9;
      const sv = v + (R() - 0.5) * 0.9;
      sites.push([clamp(su, -HALF + 0.05, HALF - 0.05), clamp(sv, ZONE_V0 + 0.05, ZONE_V1 - 0.05)]);
    }
  }
  const rect = [
    { p: [-HALF, ZONE_V0], f: OUTER },
    { p: [HALF, ZONE_V0], f: OUTER },
    { p: [HALF, ZONE_V1], f: OUTER },
    { p: [-HALF, ZONE_V1], f: OUTER },
  ];
  // Sutherland–Hodgman against half-plane dot(p - m, n) <= 0, tracking edge flags.
  function clip(poly, m, n, flag) {
    const out = [];
    const L = poly.length;
    const side = (p) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
    for (let i = 0; i < L; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % L];
      const da = side(a.p);
      const db = side(b.p);
      const ina = da <= 1e-9;
      const inb = db <= 1e-9;
      const cut = () => {
        const t = da / (da - db);
        return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
      };
      if (ina && inb) out.push({ p: a.p, f: a.f });
      else if (ina && !inb) {
        out.push({ p: a.p, f: a.f });
        out.push({ p: cut(), f: flag });
      } else if (!ina && inb) out.push({ p: cut(), f: a.f });
    }
    return out;
  }
  const hingeN = [-Math.sin(HINGE_SKEW), Math.cos(HINGE_SKEW)];
  const hingeP = [HINGE_U, HINGE_V];
  const polys = [];
  for (let i = 0; i < sites.length; i++) {
    let poly = rect.map((e) => ({ p: e.p.slice(), f: e.f }));
    const si = sites[i];
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const sj = sites[j];
      const dx = sj[0] - si[0];
      const dy = sj[1] - si[1];
      if (dx * dx + dy * dy > 16) continue;
      poly = clip(poly, [(si[0] + sj[0]) / 2, (si[1] + sj[1]) / 2], [dx, dy], CRACK);
      if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    const back = clip(poly, hingeP, hingeN, CRACK);
    const front = clip(poly, hingeP, [-hingeN[0], -hingeN[1]], CRACK);
    for (const p of [back, front]) if (p.length >= 3) polys.push(p);
  }

  // Make fracture edges jagged; neighbours share identical jitter via a canonical edge hash.
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const jhash = (a, b, k) => {
    const x = Math.sin(a[0] * 12.9898 + a[1] * 78.233 + b[0] * 37.719 + b[1] * 11.113 + k * 4.581) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let pi = 0; pi < polys.length; pi++) {
    const poly = polys[pi];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i];
      const B = poly[(i + 1) % poly.length];
      out.push(A);
      if (A.f !== CRACK) continue;
      const ra = [+A.p[0].toFixed(3), +A.p[1].toFixed(3)];
      const rb = [+B.p[0].toFixed(3), +B.p[1].toFixed(3)];
      const flip = key(ra) > key(rb);
      const P = flip ? rb : ra;
      const Q = flip ? ra : rb;
      const dx = Q[0] - P[0];
      const dy = Q[1] - P[1];
      const len = Math.hypot(dx, dy);
      const n = Math.max(2, Math.round(len / 0.2));
      const pts = [];
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const j = (jhash(P, Q, k) - 0.5) * 0.13 * Math.sqrt(Math.sin(Math.PI * t));
        pts.push([P[0] + dx * t - (dy / len) * j, P[1] + dy * t + (dx / len) * j]);
      }
      if (flip) pts.reverse();
      for (const q of pts) out.push({ p: [clamp(q[0], -HALF, HALF), q[1]], f: CRACK });
    }
    polys[pi] = out;
  }

  const chunks = [];
  const zoneGroup = new THREE.Group();
  group.add(zoneGroup);
  for (const poly of polys) {
    // Area-weighted centroid in road space.
    let A = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i].p;
      const [x1, y1] = poly[(i + 1) % poly.length].p;
      const cr = x0 * y1 - x1 * y0;
      A += cr;
      cx += (x0 + x1) * cr;
      cy += (y0 + y1) * cr;
    }
    A *= 0.5;
    if (Math.abs(A) < 0.02) continue;
    cx /= 6 * A;
    cy /= 6 * A;
    const d = hingeDist(cx, cy);
    let kind = 'stay';
    if (d >= 0 && d < PLATE_W) kind = 'plate';
    else if (d >= PLATE_W && d < PLATE_W + gapLen(cx)) kind = 'fall';

    const c0 = path.world(cx, cy, 0);
    const geo = chunkGeometry(poly, [cx, cy], c0);
    const mesh = new THREE.Mesh(geo, [roadMat, brokenMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    holder.add(mesh);
    zoneGroup.add(holder);

    const ch = {
      poly,
      uv: [cx, cy],
      c0,
      kind,
      holder,
      seed: R() * 1000,
      tb: Infinity,
      axis: new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.4, R() - 0.5).normalize(),
      spin: 0.5 + R() * 1.6,
      gk: 0.85 + R() * 0.3,
      drift: new THREE.Vector3(),
      base: null,
    };
    if (kind === 'fall') {
      const dist = Math.hypot(cx - COLLAPSE_ORIGIN.u, cy - COLLAPSE_ORIGIN.v);
      ch.tb = T_COLLAPSE + dist / COLLAPSE_SPEED + R() * 0.2;
    }
    if (kind === 'plate' && d > PLATE_W - 0.9 && Math.abs(cx - LANE_U) > 1.35) {
      ch.kind = 'plateBreak';
      ch.tb = 27.18 + R() * 0.35;
    }
    // Drift a little toward the middle of the gap while falling.
    path.frame(cy, f);
    ch.drift.copy(f.tan).multiplyScalar((PLATE_W + 6 - d) * 0.03).addScaledVector(f.right, -cx * 0.02);
    chunks.push(ch);
  }

  // Guardrail pieces riding on the slabs.
  function chunkAt(u, v) {
    for (const ch of chunks) if (pointInPoly(u, v, ch.poly)) return ch;
    return null;
  }
  for (const side of [-1, 1]) {
    for (let v = ZONE_V0; v < ZONE_V1 - 0.01; v += 2) {
      const v1 = Math.min(ZONE_V1, v + 2);
      const ch = chunkAt(side * (RAIL_U + 0.05), (v + v1) / 2);
      if (!ch) continue;
      const rail = new THREE.Mesh(railGeometry(side, v, v1, ch.c0), steelMat);
      rail.castShadow = true;
      ch.holder.add(rail);
      const pc = chunkAt(side * (RAIL_U + 0.1), v + 0.001) || ch;
      path.frame(v, f);
      const pw = path.world(side * (RAIL_U + 0.1), v, 0).sub(pc.c0);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.copy(pw);
      post.rotation.y = f.yaw;
      post.castShadow = true;
      pc.holder.add(post);
    }
  }

  function chunkGeometry(poly, cUV, c0) {
    const pos = [];
    const nrm = [];
    const ruv = [];
    const edg = [];
    const n = poly.length;
    const W = poly.map((e) => path.world(e.p[0], e.p[1], 0).sub(c0));
    const C = new THREE.Vector3(0, 0, 0);
    // top: fan with exact per-triangle distance to its own edge
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = poly[i].p;
      const b = poly[j].p;
      let h = 10;
      if (poly[i].f === CRACK) {
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        const len = Math.hypot(ex, ey) || 1;
        h = Math.abs((cUV[0] - a[0]) * ey - (cUV[1] - a[1]) * ex) / len;
      }
      const eA = poly[i].f === CRACK ? 0 : 10;
      tri(
        [C, W[i], W[j]],
        [cUV, a, b],
        [h, eA, eA],
        [0, 1, 0]
      );
    }
    const topCount = pos.length / 3;
    // sides
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const A = W[i];
      const B = W[j];
      const A2 = A.clone().setY(-THICK);
      const B2 = B.clone().setY(-THICK);
      const out = new THREE.Vector3().subVectors(A, B).cross(new THREE.Vector3(0, 1, 0)).normalize();
      const mid = A.clone().add(B).multiplyScalar(0.5);
      if (out.dot(mid) < 0) out.negate();
      const nn = [out.x, out.y, out.z];
      quad(A, B, B2, A2, nn, poly[i].p, poly[j].p);
    }
    // bottom
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(
        [C.clone().setY(-THICK), W[j].clone().setY(-THICK), W[i].clone().setY(-THICK)],
        [cUV, poly[j].p, poly[i].p],
        [10, 10, 10],
        [0, -1, 0]
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('roadUV', new THREE.Float32BufferAttribute(ruv, 2));
    g.setAttribute('edgeDist', new THREE.Float32BufferAttribute(edg, 1));
    g.addGroup(0, topCount, 0);
    g.addGroup(topCount, pos.length / 3 - topCount, 1);
    return g;

    function tri(P, U, E, N) {
      // orient triangle to match the requested normal
      const e1 = new THREE.Vector3().subVectors(P[1], P[0]);
      const e2 = new THREE.Vector3().subVectors(P[2], P[0]);
      const cr = e1.cross(e2);
      let order = [0, 1, 2];
      if (cr.x * N[0] + cr.y * N[1] + cr.z * N[2] < 0) order = [0, 2, 1];
      for (const k of order) {
        pos.push(P[k].x, P[k].y, P[k].z);
        nrm.push(N[0], N[1], N[2]);
        ruv.push(U[k][0], U[k][1]);
        edg.push(E[k]);
      }
    }
    function quad(A, B, B2, A2, N, ua, ub) {
      tri([A, B, B2], [ua, ub, ub], [10, 10, 10], N);
      tri([A, B2, A2], [ua, ub, ua], [10, 10, 10], N);
    }
  }

  // ---------------------------------------------------------------------------
  // Dust
  // ---------------------------------------------------------------------------
  const P = { origin: [], vel: [], params: [], extra: [] };
  const DR = rng(99);
  const addP = (o, v, birth, life, s0, s1, alpha, tone) => {
    P.origin.push(o.x, o.y, o.z);
    P.vel.push(v.x, v.y, v.z);
    P.params.push(birth, life, s0, s1);
    P.extra.push(alpha, tone);
  };
  for (const ch of chunks) {
    if (!isFinite(ch.tb)) continue;
    const nP = ch.kind === 'plateBreak' ? 10 : 8;
    for (let k = 0; k < nP; k++) {
      const o = ch.c0.clone().add(new THREE.Vector3((DR() - 0.5) * 1.4, (DR() - 0.6) * 0.5, (DR() - 0.5) * 1.4));
      const v = new THREE.Vector3((DR() - 0.5) * 1.6, 0.3 + DR() * 1.3, (DR() - 0.5) * 1.6);
      addP(o, v, ch.tb + DR() * 0.5, 3 + DR() * 3.5, 0.4 + DR() * 0.4, 1.6 + DR() * 1.6, 0.22, 0);
    }
  }
  for (let k = 0; k < 360; k++) {
    const u = (DR() - 0.5) * 2 * HALF;
    const d = PLATE_W + DR() * gapLen(u);
    const v = HINGE_V + (d + (u - HINGE_U) * Math.sin(HINGE_SKEW)) / Math.cos(HINGE_SKEW);
    const o = path.world(u, v, -0.5 - DR() * 3.5);
    addP(o, new THREE.Vector3((DR() - 0.5) * 0.5, 0.5 + DR() * 1.0, (DR() - 0.5) * 0.5), 23.4 + DR() * 10, 5 + DR() * 3, 1.0, 2.4 + DR() * 1.6, 0.085, 0);
  }
  for (let k = 0; k < 70; k++) {
    const u = (DR() - 0.5) * 2 * HALF;
    const v = HINGE_V + (u - HINGE_U) * Math.tan(HINGE_SKEW);
    const o = path.world(u, v, 0.05);
    const tb = k < 40 ? 24.55 + DR() * 0.8 : k < 58 ? 27.15 + DR() * 0.4 : 28.65 + DR() * 0.4;
    addP(o, new THREE.Vector3((DR() - 0.5) * 0.6, 0.25 + DR() * 0.5, (DR() - 0.5) * 0.6), tb, 2.5 + DR() * 2, 0.25, 1.1 + DR() * 0.7, 0.26, 0);
  }
  {
    const pose = {};
    const lp = new THREE.Vector3();
    const fw = new THREE.Vector3();
    for (let k = 0; k < 160; k++) {
      const tb = 25.3 + (k / 160) * 9 + DR() * 0.04;
      carPoseAt(tb, pose);
      const side = k % 2 ? 1 : -1;
      lp.set(side * 0.8, 0.06, -1.475 - 0.15).applyMatrix4(pose.matrix);
      fw.set(0, 0, 1).transformDirection(pose.matrix);
      const v = fw.clone().multiplyScalar(-(0.9 + DR() * 1.2)).add(new THREE.Vector3((DR() - 0.5) * 0.6, 0.2 + DR() * 0.4, (DR() - 0.5) * 0.6));
      addP(lp.clone(), v, tb, 1.6 + DR() * 1.4, 0.2, 0.9 + DR() * 0.6, 0.1, 1);
    }
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.Float32BufferAttribute(P.origin, 3));
  dGeo.setAttribute('vel', new THREE.Float32BufferAttribute(P.vel, 3));
  dGeo.setAttribute('params', new THREE.Float32BufferAttribute(P.params, 4));
  dGeo.setAttribute('extra', new THREE.Float32BufferAttribute(P.extra, 2));
  const dustUniforms = {
    uTime: { value: 0 },
    uScale: { value: 800 },
    uFogColor: { value: scene.fog.color },
    uFogDensity: { value: scene.fog.density },
    uSun: { value: SUN_DIR },
  };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec3 vel; attribute vec4 params; attribute vec2 extra;
      uniform float uTime; uniform float uScale;
      varying float vA; varying float vTone; varying float vDepth; varying float vSeed;
      void main() {
        float age = uTime - params.x;
        if (age < 0.0 || age > params.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
        float k = 1.1;
        vec3 p = position + vel * (1.0 - exp(-k * age)) / k + vec3(0.0, 0.12, 0.0) * age * age;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float x = age / params.y;
        gl_PointSize = min(mix(params.z, params.w, sqrt(x)) * uScale / -mv.z, 420.0);
        vA = extra.x * smoothstep(0.0, 0.12, x) * (1.0 - smoothstep(0.35, 1.0, x));
        vTone = extra.y; vDepth = -mv.z; vSeed = fract(params.x * 13.7 + position.x);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFogColor; uniform float uFogDensity;
      varying float vA; varying float vTone; varying float vDepth; varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        float a = pow(max(0.0, 1.0 - r), 1.8);
        float n = sin(c.x * 11.0 + vSeed * 40.0) * sin(c.y * 9.0 - vSeed * 25.0);
        a *= 0.8 + 0.2 * n;
        vec3 dust = mix(vec3(0.46, 0.41, 0.36), vec3(0.62, 0.6, 0.58), vTone);
        dust *= 0.9 + 0.35 * (0.5 - c.y);
        float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
        gl_FragColor = vec4(mix(dust, uFogColor, fog), a * vA * smoothstep(2.0, 8.0, vDepth));
      }`,
  });
  const dust = new THREE.Points(dGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 20;
  scene.add(dust);

  // ---------------------------------------------------------------------------
  const plate = new THREE.Matrix4();
  const M = new THREE.Matrix4();
  const R4 = new THREE.Matrix4();
  const T4 = new THREE.Matrix4();
  const q = new THREE.Vector3();

  function update(ts, viewScale) {
    uniforms.uDamage.value = damage(ts);
    uniforms.uZoneCrack.value = zoneCrack(ts);
    dustUniforms.uTime.value = ts;
    dustUniforms.uScale.value = viewScale;
    plateMatrix(path, ts, plate);
    const trem = tremor(ts);
    for (const ch of chunks) {
      const jit = trem * 0.006;
      q.set(noise1(ts * 23 + ch.seed) * jit, noise1(ts * 19 + ch.seed * 1.3) * jit * 0.6, noise1(ts * 21 + ch.seed * 0.7) * jit);
      const onPlate = ch.kind === 'plate' || ch.kind === 'plateBreak';
      if (ts < ch.tb) {
        // pre-break sag
        const sag = isFinite(ch.tb) ? -0.03 * smoothstep(ch.tb - 0.4, ch.tb, ts) : 0;
        M.makeTranslation(ch.c0.x + q.x, ch.c0.y + q.y + sag, ch.c0.z + q.z);
        if (onPlate) M.premultiply(plate);
        ch.holder.visible = true;
      } else {
        const tau = ts - ch.tb;
        const dy = -0.03 - 0.5 * G * ch.gk * tau * tau;
        if (dy < WATER_Y - 6) {
          ch.holder.visible = false;
          continue;
        }
        ch.holder.visible = true;
        R4.makeRotationAxis(ch.axis, ch.spin * tau + 0.6 * tau * tau);
        M.makeTranslation(ch.c0.x, ch.c0.y, ch.c0.z).multiply(R4);
        if (onPlate) {
          if (!ch.base) ch.base = plateMatrix(path, ch.tb, new THREE.Matrix4());
          M.premultiply(ch.base);
        }
        T4.makeTranslation(ch.drift.x * tau, dy, ch.drift.z * tau);
        M.premultiply(T4);
      }
      ch.holder.matrix.copy(M);
      ch.holder.matrixWorldNeedsUpdate = true;
    }
  }

  return { update, chunks };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i].p;
    const [xj, yj] = poly[j].p;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Ensure indexed triangles face up (+Y).
function fixWinding(geo) {
  const p = geo.attributes.position;
  const idx = geo.index.array;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(p, idx[i]);
    b.fromBufferAttribute(p, idx[i + 1]);
    c.fromBufferAttribute(p, idx[i + 2]);
    const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
    if (ny < 0) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
  }
}
