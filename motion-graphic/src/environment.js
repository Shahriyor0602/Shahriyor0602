import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { rng } from './util.js';

// Golden-hour coastal setting: physical sky, sea, hazy hills and a distant skyline.
export const SUN_DIR = new THREE.Vector3(0.52, 0.155, 0.84).normalize();
export const WATER_Y = -19;

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm2(x, y) {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < 5; i++) {
    s += a * vnoise2(x, y);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 3.7;
    a *= 0.5;
  }
  return s;
}

// Clamp the sky's output so the sun disc does not flood the bloom pass.
function clampSky(sky, maxV) {
  sky.material.fragmentShader = sky.material.fragmentShader.replace(
    'gl_FragColor = vec4( retColor, 1.0 );',
    `gl_FragColor = vec4( min( retColor, vec3( ${maxV.toFixed(1)} ) ), 1.0 );`
  );
}
function setSky(sky) {
  const u = sky.material.uniforms;
  u.turbidity.value = 4.2;
  u.rayleigh.value = 1.35;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(SUN_DIR);
}
// Average linear sky radiance around the horizon, used as the fog colour so
// distant geometry dissolves into the sky seamlessly.
function sampleHorizon(renderer, skyScene) {
  const rt = new THREE.WebGLRenderTarget(8, 8, { type: THREE.FloatType });
  const cam = new THREE.PerspectiveCamera(20, 1, 0.1, 5000);
  const buf = new Float32Array(8 * 8 * 4);
  const acc = new THREE.Color(0, 0, 0);
  const az0 = Math.atan2(SUN_DIR.x, SUN_DIR.z);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const az = az0 + Math.PI * 0.35 + (i / (n - 1)) * Math.PI * 1.3;
    cam.position.set(0, 0, 0);
    cam.lookAt(Math.sin(az), 0.03, Math.cos(az));
    renderer.setRenderTarget(rt);
    renderer.render(skyScene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, 8, 8, buf);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < 64; k++) {
      r += buf[k * 4];
      g += buf[k * 4 + 1];
      b += buf[k * 4 + 2];
    }
    acc.r += r / 64 / n;
    acc.g += g / 64 / n;
    acc.b += b / 64 / n;
  }
  renderer.setRenderTarget(null);
  rt.dispose();
  if (!(acc.r > 0) || !isFinite(acc.r)) return new THREE.Color(0.5, 0.52, 0.56);
  return acc;
}

export function buildEnvironment(scene, renderer) {
  // --- Sky ------------------------------------------------------------------
  const sky = new Sky();
  sky.scale.setScalar(45000);
  setSky(sky);
  clampSky(sky, 3.2);
  scene.add(sky);

  // Image-based lighting captured from the same sky.
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(900);
  setSky(envSky);
  clampSky(envSky, 3.2);
  envScene.add(envSky);
  const horizon = sampleHorizon(renderer, envScene);
  // A dark "ground" hemisphere so reflections read as sky above / land below.
  const groundDome = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.055, 0.06, 0.065), side: THREE.BackSide })
  );
  envScene.add(groundDome);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(envScene, 0.02, 0.1, 2000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  // --- Lights ---------------------------------------------------------------
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.84, 0.68), 4.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -9;
  sc.right = 9;
  sc.top = 9;
  sc.bottom = -9;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(new THREE.Color(0.58, 0.64, 0.8), new THREE.Color(0.22, 0.19, 0.16), 0.4);
  scene.add(hemi);

  scene.fog = new THREE.FogExp2(horizon, 0.00042);

  // --- Sea ------------------------------------------------------------------
  const seaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.012, 0.045, 0.07),
    roughness: 0.16,
    metalness: 0.0,
  });
  const seaUniforms = { uTime: { value: 0 } };
  seaMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = seaUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec2 p = vWPos.xz;
          vec2 g = vec2(0.0);
          float t = uTime;
          vec2 d1 = normalize(vec2(0.8, 0.6)); float k1 = 0.21; g += d1 * cos(dot(d1, p) * k1 + t * 1.1) * 0.06;
          vec2 d2 = normalize(vec2(-0.3, 1.0)); float k2 = 0.47; g += d2 * cos(dot(d2, p) * k2 + t * 1.7) * 0.04;
          vec2 d3 = normalize(vec2(1.0, -0.2)); float k3 = 1.13; g += d3 * cos(dot(d3, p) * k3 + t * 2.3) * 0.025;
          vec2 d4 = normalize(vec2(0.2, 0.9)); float k4 = 2.7; g += d4 * cos(dot(d4, p) * k4 + t * 3.1) * 0.012;
          float fade = 1.0 - smoothstep(150.0, 1400.0, length(vWPos - cameraPosition));
          vec3 nw = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
          normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
        }`
      );
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WATER_Y;
  scene.add(sea);

  // --- Terrain: hills along the right-hand shore, low land across the bay ---
  const tGeo = new THREE.PlaneGeometry(12000, 12000, 220, 220);
  tGeo.rotateX(-Math.PI / 2);
  const pos = tGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cLow = new THREE.Color(0.2, 0.22, 0.15);
  const cHigh = new THREE.Color(0.33, 0.31, 0.28);
  const cCity = new THREE.Color(0.28, 0.28, 0.27);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + 1200;
    // Right-hand shore (x < 0 is the driver's right).
    const coast = -330 - 140 * Math.sin(z / 650) - 60 * Math.sin(z / 230);
    const land = THREE.MathUtils.smoothstep(-x, -coast - 40, -coast + 120);
    const hills = THREE.MathUtils.smoothstep(-x, -coast + 250, -coast + 900);
    const n = fbm2(x / 520, z / 520);
    let h = WATER_Y - 8 + land * 10 + hills * (60 + 420 * n * n);
    // Far shore across the bay on the left.
    const far = THREE.MathUtils.smoothstep(x, 2600, 3400);
    h = Math.max(h, WATER_Y - 8 + far * (12 + 180 * fbm2(x / 400 + 9, z / 400)));
    // Flat coastal plain for the city ahead-right.
    const city =
      THREE.MathUtils.smoothstep(z, 1500, 1800) *
      (1 - THREE.MathUtils.smoothstep(z, 3200, 3600)) *
      THREE.MathUtils.smoothstep(-x, 300, 450) *
      (1 - THREE.MathUtils.smoothstep(-x, 1700, 2000));
    h = h * (1 - city) + (WATER_Y + 2) * city;
    pos.setY(i, h);
    tmp.copy(cLow).lerp(cHigh, THREE.MathUtils.clamp((h - WATER_Y) / 250, 0, 1)).lerp(cCity, city);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    tGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  );
  terrain.position.z = 1200;
  scene.add(terrain);

  // --- Distant skyline ------------------------------------------------------
  const R = rng(7);
  const count = 170;
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.25 });
  const city = new THREE.InstancedMesh(bGeo, bMat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const cx = -950 + (R() - 0.5) * 900 * (0.4 + R());
    const cz = 2500 + (R() - 0.5) * 1300;
    const core = Math.exp(-(((cx + 950) / 450) ** 2) - ((cz - 2500) / 600) ** 2);
    const h = 18 + (40 + 190 * core) * (0.35 + R() * 0.9);
    const w = 18 + R() * 30;
    const d = 18 + R() * 30;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.3);
    m.compose(new THREE.Vector3(cx, WATER_Y + 2, cz), q, new THREE.Vector3(w, h, d));
    city.setMatrixAt(i, m);
    c.setRGB(0.2 + R() * 0.08, 0.22 + R() * 0.08, 0.26 + R() * 0.08);
    city.setColorAt(i, c);
  }
  scene.add(city);

  return {
    sun,
    update(t, focus) {
      seaUniforms.uTime.value = t;
      // Keep the shadow frustum centred on the car.
      sun.position.copy(focus).addScaledVector(SUN_DIR, 60);
      sun.target.position.copy(focus);
      sun.target.updateMatrixWorld();
    },
  };
}
