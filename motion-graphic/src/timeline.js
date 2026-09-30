import * as THREE from 'three';
import { clamp, smoothstep, smootherstep, window01, fbm1, noise1, spline, DEG } from './util.js';

// ---------------------------------------------------------------------------
// Master timeline (seconds). `t` is presentation time; `ts` is simulation time,
// which slows down for the closing shot.
// ---------------------------------------------------------------------------
export const DURATION = 36;
export const SLOWMO_AT = 29.5;
export const SLOWMO_RATE = 0.42;
export const simTime = (t) => (t < SLOWMO_AT ? t : SLOWMO_AT + (t - SLOWMO_AT) * SLOWMO_RATE);

// Car motion
export const LANE_U = 1.8; // right-hand lane centre
export const WHEELBASE = 2.95;
export const TRACK = 1.6;
export const WHEEL_R = 0.345;
const S0 = 30; // start arc length
const V0 = 13; // m/s (~47 km/h)
const T_BRAKE = 23.2;
const T_STOP = 25.1;
const DECEL = V0 / (T_STOP - T_BRAKE);
export const S_STOP = S0 + V0 * T_BRAKE + 0.5 * V0 * (T_STOP - T_BRAKE);

export function carS(ts) {
  if (ts < T_BRAKE) return S0 + V0 * ts;
  if (ts < T_STOP) {
    const d = ts - T_BRAKE;
    return S0 + V0 * T_BRAKE + V0 * d - 0.5 * DECEL * d * d;
  }
  return S_STOP;
}
export function carSpeed(ts) {
  if (ts < T_BRAKE) return V0;
  if (ts < T_STOP) return V0 - DECEL * (ts - T_BRAKE);
  return 0;
}

// Road deterioration
export const damage = (ts) => smoothstep(14.2, 22.8, ts); // surface cracking (equity eroding)
export const zoneCrack = (ts) => smoothstep(18.0, 23.0, ts); // fracture lines of the collapse zone
export const T_COLLAPSE = 23.0;
export const roadIntegrity = (ts) =>
  clamp(1 - 0.45 * smoothstep(14.2, 22.8, ts) - 0.55 * smoothstep(22.8, 26.5, ts));

export function tremor(ts) {
  return (
    0.35 * window01(ts, 21.6, 23.2, 1.2, 0.3) +
    1.0 * window01(ts, 23.0, 26.2, 0.2, 1.6) +
    0.55 * window01(ts, 27.1, 28.0, 0.05, 0.8) +
    0.4 * window01(ts, 28.6, 29.4, 0.05, 0.7)
  );
}

// Collapse geometry, in road coordinates. The slab under the car's front half
// hinges downward about a slanted fracture line; everything beyond it falls away.
export const HINGE_U = LANE_U;
export const HINGE_V = S_STOP - 0.3;
export const HINGE_SKEW = 12 * DEG;
export const PLATE_W = 3.2;
export const gapLen = (u) => 12.5 + 1.4 * Math.sin(u * 0.9 + 0.4) + 0.8 * Math.sin(u * 2.3);
export const ZONE_V0 = HINGE_V - 3.2;
export const ZONE_V1 = HINGE_V + PLATE_W + 17.5;
export const COLLAPSE_ORIGIN = { u: 1.2, v: HINGE_V + 9 };
export const COLLAPSE_SPEED = 9;
const hn = { u: -Math.sin(HINGE_SKEW), v: Math.cos(HINGE_SKEW) }; // normal toward the gap
export const hingeDist = (u, v) => (u - HINGE_U) * hn.u + (v - HINGE_V) * hn.v;

export function plateAngle(ts) {
  const a0 = 24.55;
  let a = 0;
  if (ts > a0) {
    const x = clamp((ts - a0) / 0.8);
    // ease-out with a small elastic settle
    const main = 1 - Math.pow(1 - x, 3) + 0.08 * Math.sin(x * Math.PI * 2.2) * (1 - x);
    a = 10.5 * main;
  }
  a += 2.4 * smoothstep(25.5, 31, ts);
  a += 1.3 * smoothstep(27.15, 27.3, ts);
  a += 0.8 * smoothstep(28.65, 28.8, ts);
  return a * DEG;
}

const _hw = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
export function plateMatrix(path, ts, out = new THREE.Matrix4()) {
  const a = plateAngle(ts);
  if (a === 0) return out.identity();
  const f = path.frame(HINGE_V);
  path.world(HINGE_U, HINGE_V, 0, _hw);
  _ax
    .copy(f.right)
    .multiplyScalar(Math.cos(HINGE_SKEW))
    .addScaledVector(f.tan, Math.sin(HINGE_SKEW))
    .normalize()
    .negate();
  out.makeTranslation(_hw.x, _hw.y, _hw.z);
  out.multiply(_m1.makeRotationAxis(_ax, a));
  out.multiply(_m2.makeTranslation(-_hw.x, -_hw.y, -_hw.z));
  return out;
}

// ---------------------------------------------------------------------------
// Driver inputs
// ---------------------------------------------------------------------------
export const STEER_DISPLAY_GAIN = 2.4; // visual exaggeration of road-wheel angle
export const STEERING_RATIO = 13;

export function steerAngle(path, ts) {
  const s = carS(ts);
  const f = path.frame(s + WHEELBASE * 0.5);
  let d = Math.atan(WHEELBASE * f.curv) * STEER_DISPLAY_GAIN;
  d += 0.6 * DEG * fbm1(ts * 0.55, 4) * (1 + 1.5 * damage(ts)); // small corrections
  // Frantic counter-steering as the road gives way.
  const panic = window01(ts, 23.25, 27.5, 0.25, 1.4);
  d += panic * (13 * DEG) * Math.sin((ts - 23.25) * 2 * Math.PI * 0.85) * (0.6 + 0.4 * noise1(ts * 1.7, 9));
  return d;
}

export const slipYaw = (ts) => -6.5 * DEG * smootherstep(23.5, 25.0, ts);
export const slipDrift = (ts) => 0.22 * smootherstep(23.5, 25.0, ts);

// Cumulative integrals (wheel spin, crankshaft) via a precomputed table.
class Cumulative {
  constructor(rate, tMax = 40, dt = 1 / 240) {
    this.dt = dt;
    const n = Math.ceil(tMax / dt) + 1;
    this.tab = new Float64Array(n);
    let acc = 0;
    let prev = rate(0);
    for (let i = 1; i < n; i++) {
      const r = rate(i * dt);
      acc += (prev + r) * 0.5 * dt;
      prev = r;
      this.tab[i] = acc;
    }
  }
  at(t) {
    const f = clamp(t / this.dt, 0, this.tab.length - 1.001);
    const i = Math.floor(f);
    return this.tab[i] + (this.tab[i + 1] - this.tab[i]) * (f - i);
  }
}
// Visual engine speed (rev/s): slowed down from real RPM so motion reads on camera.
export const engineRate = (ts) => 2.3 + 0.9 * smoothstep(25.0, 26.0, ts) + 0.25 * smoothstep(23.2, 23.6, ts);
const crankInt = new Cumulative(engineRate);
export const crankAngle = (ts) => crankInt.at(ts) * Math.PI * 2;
// Rear wheels keep spinning after the car stops: power with no progress.
const rearSpinInt = new Cumulative((ts) => 7.5 * smoothstep(25.0, 25.9, ts));
export const frontWheelAngle = (ts) => carS(ts) / WHEEL_R;
export const rearWheelAngle = (ts) => carS(ts) / WHEEL_R + rearSpinInt.at(ts);
export const rearWheelSpinRate = (ts) => carSpeed(ts) / WHEEL_R + 7.5 * smoothstep(25.0, 25.9, ts);

// ---------------------------------------------------------------------------
// Car pose: contact-point solve so that the chassis follows the hinged slab.
// ---------------------------------------------------------------------------
const _f = {};
const _plate = new THREE.Matrix4();
const _c = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const _o = new THREE.Vector3();
const _fw = new THREE.Vector3();
const _lt = new THREE.Vector3();
const _up = new THREE.Vector3();
const CONTACTS = [
  [TRACK / 2, WHEELBASE / 2], // front-left (local +x = left)
  [-TRACK / 2, WHEELBASE / 2], // front-right
  [TRACK / 2, -WHEELBASE / 2], // rear-left
  [-TRACK / 2, -WHEELBASE / 2], // rear-right
];

export function carPose(path, ts, out = {}) {
  const s = carS(ts);
  const f = path.frame(s, _f);
  const yaw = f.yaw + slipYaw(ts);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const base = path.world(LANE_U + slipDrift(ts), s, 0, _o);
  plateMatrix(path, ts, _plate);
  const tilted = plateAngle(ts) > 0;
  for (let i = 0; i < 4; i++) {
    const [lx, lz] = CONTACTS[i];
    // rotate local (lx, lz) by yaw about +Y
    const p = _c[i].set(base.x + lx * cy + lz * sy, 0, base.z - lx * sy + lz * cy);
    if (tilted) {
      const r = path.toRoad(p, s + lz);
      const d = hingeDist(r.u, r.v);
      if (d >= 0 && d < PLATE_W) p.applyMatrix4(_plate);
    }
  }
  const [fl, fr, rl, rr] = _c;
  _fw.set(fl.x + fr.x - rl.x - rr.x, fl.y + fr.y - rl.y - rr.y, fl.z + fr.z - rl.z - rr.z).normalize();
  _lt.set(fl.x + rl.x - fr.x - rr.x, fl.y + rl.y - fr.y - rr.y, fl.z + rl.z - fr.z - rr.z).normalize();
  _up.crossVectors(_fw, _lt).normalize();
  _lt.crossVectors(_up, _fw).normalize();
  out.matrix = out.matrix || new THREE.Matrix4();
  out.matrix.makeBasis(_lt, _up, _fw);
  out.matrix.setPosition(
    (fl.x + fr.x + rl.x + rr.x) / 4,
    (fl.y + fr.y + rl.y + rr.y) / 4,
    (fl.z + fr.z + rl.z + rr.z) / 4
  );
  out.s = s;
  out.speed = carSpeed(ts);
  out.pathYaw = f.yaw;
  out.curv = f.curv;
  return out;
}

// Sprung-mass motion relative to the wheels (pitch, roll, bounce) in radians/metres.
export function suspension(path, ts) {
  const v = carSpeed(ts);
  const f = path.frame(carS(ts), _f);
  const bumpy = 0.0025 + 0.011 * damage(ts) + 0.02 * tremor(ts);
  const bounce = bumpy * fbm1(ts * 7.3, 2);
  const brake = smoothstep(T_BRAKE, T_BRAKE + 0.25, ts) * (1 - smoothstep(T_STOP - 0.1, T_STOP + 0.5, ts));
  const settle = Math.exp(-3 * Math.max(0, ts - T_STOP)) * Math.sin(Math.max(0, ts - T_STOP) * 11) * (ts > T_STOP ? 1 : 0);
  const pitch = 1.6 * DEG * brake - 0.9 * DEG * settle + bumpy * 0.9 * fbm1(ts * 5.1, 5);
  const roll = 0.0065 * f.curv * v * v + bumpy * 0.8 * fbm1(ts * 4.3, 8) + 0.015 * tremor(ts) * fbm1(ts * 3.1, 11);
  return { pitch, roll, bounce };
}

// ---------------------------------------------------------------------------
// Camera: keyframes in the car's heading frame, as (azimuth°, radius, height).
// Azimuth 0 = in front of the car, 90 = driver's left side, 180 = behind.
// ---------------------------------------------------------------------------
const CAM_KEYS = [
  // t,   az,   r,    y,   tx,  ty,   tz,  fov
  [0.0, 24, 8.8, 0.9, 0, 0.62, 0.3, 30],
  [5.5, 76, 6.5, 1.45, 0, 0.72, 0.25, 30],
  [10.2, 42, 5.9, 3.4, 0, 0.66, 0.85, 32],
  [14.0, 28, 5.8, 1.2, 0, 0.55, 0.9, 30],
  [18.6, 150, 8.3, 2.3, 0, 0.6, 5.0, 36],
  [22.2, 64, 12.5, 3.8, 0, 0.0, 5.0, 38],
  [26.6, 48, 8.6, 2.4, 0, 0.25, 1.8, 35],
  [31.0, 38, 11.5, 3.8, -1.7, 0.1, 1.6, 34],
  [36.5, 52, 12.5, 4.2, -1.7, 0.1, 1.4, 34],
];
const camSpl = [];
for (let c = 1; c < 8; c++) camSpl.push(spline(CAM_KEYS.map((k) => [k[0], k[c]])));

export function cameraRig(t) {
  const [az, r, y, tx, ty, tz, fov] = camSpl.map((s) => s.at(t));
  const a = az * DEG;
  const drift = 0.03;
  return {
    pos: new THREE.Vector3(
      r * Math.sin(a) + drift * fbm1(t * 0.31, 21),
      y + drift * fbm1(t * 0.27, 22),
      r * Math.cos(a) + drift * fbm1(t * 0.23, 23)
    ),
    target: new THREE.Vector3(tx + 0.02 * fbm1(t * 0.4, 24), ty + 0.015 * fbm1(t * 0.37, 25), tz),
    fov,
  };
}
