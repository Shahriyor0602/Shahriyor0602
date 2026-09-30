import * as THREE from 'three';

// The road centreline: a gentle coastal S-curve along +Z.
// Road coordinates: u = lateral offset in metres (+u = driver's right),
// v = arc length in metres along the centreline.
const TAU = Math.PI * 2;
const X = (z) => 5 * Math.sin((TAU * z) / 180 + 0.6) + 2 * Math.sin((TAU * z) / 75 + 1.3);
const dX = (z) =>
  5 * (TAU / 180) * Math.cos((TAU * z) / 180 + 0.6) + 2 * (TAU / 75) * Math.cos((TAU * z) / 75 + 1.3);
const ddX = (z) =>
  -5 * (TAU / 180) ** 2 * Math.sin((TAU * z) / 180 + 0.6) -
  2 * (TAU / 75) ** 2 * Math.sin((TAU * z) / 75 + 1.3);

const UP = new THREE.Vector3(0, 1, 0);

export class RoadPath {
  constructor(zMin = -160, zMax = 1200, dz = 0.25) {
    const n = Math.ceil((zMax - zMin) / dz) + 1;
    this.z = new Float64Array(n);
    this.len = new Float64Array(n);
    let px = X(zMin);
    let pz = zMin;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const z = zMin + i * dz;
      const x = X(z);
      if (i > 0) acc += Math.hypot(x - px, z - pz);
      this.z[i] = z;
      this.len[i] = acc;
      px = x;
      pz = z;
    }
    // Shift so that v = 0 sits at z = 0.
    const off = this.vAtZ(0);
    for (let i = 0; i < n; i++) this.len[i] -= off;
  }

  vAtZ(z) {
    const { z: zs, len } = this;
    const f = (z - zs[0]) / (zs[1] - zs[0]);
    const i = Math.max(0, Math.min(zs.length - 2, Math.floor(f)));
    return len[i] + (len[i + 1] - len[i]) * (f - i);
  }

  zAtV(v) {
    const { z: zs, len } = this;
    let lo = 0;
    let hi = len.length - 1;
    if (v <= len[0]) return zs[0];
    if (v >= len[hi]) return zs[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (len[mid] > v) hi = mid;
      else lo = mid;
    }
    return zs[lo] + ((v - len[lo]) / (len[hi] - len[lo])) * (zs[hi] - zs[lo]);
  }

  // Frame at arc length v: position, unit tangent, unit right vector, signed curvature.
  frame(v, out = {}) {
    const z = this.zAtV(v);
    const d = dX(z);
    const inv = 1 / Math.sqrt(1 + d * d);
    out.pos = (out.pos || new THREE.Vector3()).set(X(z), 0, z);
    out.tan = (out.tan || new THREE.Vector3()).set(d * inv, 0, inv);
    out.right = (out.right || new THREE.Vector3()).crossVectors(out.tan, UP);
    out.curv = ddX(z) * inv * inv * inv; // > 0 bends toward +x (driver's left)
    out.yaw = Math.atan2(out.tan.x, out.tan.z);
    return out;
  }

  // World position of road coordinate (u, v) at height h.
  world(u, v, h = 0, out = new THREE.Vector3()) {
    const f = this.frame(v, _f);
    return out.copy(f.pos).addScaledVector(f.right, u).setY(h);
  }

  // Approximate inverse of world() near a known arc length.
  toRoad(p, vGuess) {
    let v = vGuess;
    for (let k = 0; k < 3; k++) {
      const f = this.frame(v, _f);
      v += (p.x - f.pos.x) * f.tan.x + (p.z - f.pos.z) * f.tan.z;
    }
    const f = this.frame(v, _f);
    const u = (p.x - f.pos.x) * f.right.x + (p.z - f.pos.z) * f.right.z;
    return { u, v };
  }
}
const _f = {};
