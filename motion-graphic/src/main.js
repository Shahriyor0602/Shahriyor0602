import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoadPath } from './path.js';
import { buildEnvironment } from './environment.js';
import { buildRoad } from './road.js';
import { buildCar } from './car.js';
import { buildOverlay } from './overlay.js';
import { fbm1, DEG } from './util.js';
import {
  DURATION,
  simTime,
  carS,
  carSpeed,
  carPose,
  suspension,
  steerAngle,
  crankAngle,
  engineRate,
  frontWheelAngle,
  rearWheelAngle,
  rearWheelSpinRate,
  cameraRig,
  tremor,
  roadIntegrity,
  LANE_U,
  WHEEL_R,
  STEERING_RATIO,
  SLOWMO_AT,
  SLOWMO_RATE,
} from './timeline.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const CAPTIONS = params.get('captions') !== '0';
const FPS = parseFloat(params.get('fps') || '30');
const START = parseFloat(params.get('t') || '0');

const stage = document.getElementById('stage');

// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: RECORD, powerPreference: 'high-performance' });
renderer.setPixelRatio(RECORD ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 60000);

const path = new RoadPath(-160, 2700);
const env = buildEnvironment(scene, renderer);
const road = buildRoad(scene, path, (ts, out) => carPose(path, ts, out));
const car = buildCar();
scene.add(car.root);
const overlay = buildOverlay(stage, { captions: CAPTIONS });

// Post: MSAA render → bloom → tone map → vignette & grain.
const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(16, 16), 0.5, 0.45, 3.4);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFrame; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      float vig = smoothstep(1.15, 0.35, length(q));
      c.rgb *= mix(0.78, 1.0, vig);
      c.rgb += (h(vUv * uRes + uFrame * 17.0) - 0.5) * 0.018;
      gl_FragColor = c;
    }`,
});
composer.addPass(finish);

function resize() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  let w = W;
  let h = Math.round((W * 9) / 16);
  if (h > H) {
    h = H;
    w = Math.round((H * 16) / 9);
  }
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--u', `${w / 1920}px`);
  renderer.setSize(w, h);
  composer.setSize(w, h);
  finish.uniforms.uRes.value.set(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
const poseObj = {};
const tmp = new THREE.Vector3();
const base = new THREE.Vector3();
const anchorsOut = { engine: { x: 0, y: 0, visible: true }, steering: { x: 0, y: 0, visible: true }, road: { x: 0, y: 0, visible: true } };
let frameNo = 0;

function project(v, out) {
  tmp.copy(v).project(camera);
  out.x = (tmp.x * 0.5 + 0.5) * 1920;
  out.y = (-tmp.y * 0.5 + 0.5) * 1080;
  out.visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
}

function renderAt(t) {
  const ts = simTime(t);
  const dtsdt = t < SLOWMO_AT ? 1 : SLOWMO_RATE;
  const pose = carPose(path, ts, poseObj);
  const susp = suspension(path, ts);
  const steer = steerAngle(path, ts);
  car.update({
    pose,
    susp,
    steer,
    crank: crankAngle(ts),
    frontSpin: frontWheelAngle(ts),
    rearSpin: rearWheelAngle(ts),
    frontRate: carSpeed(ts) / WHEEL_R,
    rearRate: rearWheelSpinRate(ts),
    shutter: (0.5 / FPS) * dtsdt,
    glow: 0.5 + 0.5 * Math.sin(t * 2.2),
  });

  // Camera rig in the road's heading frame.
  const s = carS(ts);
  const f = path.frame(s);
  path.world(LANE_U, s, 0, base);
  const rig = cameraRig(t);
  if (window.__camOverride) {
    const c = window.__camOverride;
    rig.pos.set(c[0], c[1], c[2]);
    rig.target.set(c[3], c[4], c[5]);
    rig.fov = c[6];
  }
  const cy = Math.cos(f.yaw);
  const sy = Math.sin(f.yaw);
  const rot = (v) => new THREE.Vector3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
  const sh = tremor(ts) * 0.035;
  camera.position.copy(base).add(rot(rig.pos));
  camera.position.x += sh * fbm1(ts * 11, 31);
  camera.position.y += sh * fbm1(ts * 13, 32);
  camera.position.z += sh * fbm1(ts * 12, 33);
  camera.fov = rig.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(tmp.copy(base).add(rot(rig.target)));
  camera.rotateZ(sh * 0.4 * fbm1(ts * 9, 34) * DEG * 10);

  const carPos = new THREE.Vector3().setFromMatrixPosition(pose.matrix);
  env.update(ts, carPos);
  const viewScale = renderer.domElement.height / (2 * Math.tan((camera.fov * DEG) / 2));
  road.update(ts, viewScale);

  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  project(car.anchors.engine.getWorldPosition(new THREE.Vector3()), anchorsOut.engine);
  project(car.anchors.steering.getWorldPosition(new THREE.Vector3()), anchorsOut.steering);
  project(path.world(LANE_U - 0.2, s + 8.5, 0), anchorsOut.road);

  overlay.update(t, {
    anchors: anchorsOut,
    rpm: 850 + engineRate(ts) * 560 + 25 * Math.sin(t * 7.1),
    wheelDeg: (steer * STEERING_RATIO) / DEG,
    integrity: roadIntegrity(ts),
  });

  finish.uniforms.uFrame.value = frameNo++ % 64;
  composer.render();
}

// ---------------------------------------------------------------------------
if (RECORD) {
  renderer.compile(scene, camera);
  window.__renderFrame = (t) => {
    renderAt(t);
    return new Promise((r) => requestAnimationFrame(() => r(true)));
  };
  window.__duration = DURATION;
  window.__ready = true;
} else {
  let t = START;
  let playing = true;
  let last = performance.now();
  const hint = document.getElementById('hint');
  let hintTimer = 0;
  const showHint = () => {
    hint.style.opacity = '1';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => (hint.style.opacity = '0'), 2600);
  };
  window.addEventListener('mousemove', showHint);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') playing = !playing;
    else if (e.code === 'ArrowRight') t = Math.min(DURATION, t + 2);
    else if (e.code === 'ArrowLeft') t = Math.max(0, t - 2);
    else if (e.code === 'KeyR') t = 0;
    else if (e.code === 'KeyF') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } else return;
    e.preventDefault();
    showHint();
  });
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t += dt;
      if (t > DURATION) t = 0;
    }
    renderAt(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
