import * as THREE from 'three';
import { gsap } from 'gsap';

// Authoring frame: all layout happens on a 1920×1080 stage. The 3D camera is
// fitted so that the same 16:9 frame maps to world space at z = 0, which keeps
// DOM text and particles aligned on any screen.
export const FRAME = { w: 1920, h: 1080, aspect: 16 / 9 };
const BASE_FOV = 35;
const CAM_Z = 10;
// World-space size of the 16:9 frame at z = 0.
export const WORLD_H = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
export const WORLD_W = WORLD_H * FRAME.aspect;

// Convert stage pixels (1920×1080, origin top-left) to world coords at z = 0.
export function px(x, y) {
  return [(x / FRAME.w - 0.5) * WORLD_W, (0.5 - y / FRAME.h) * WORLD_H];
}

export function createStage(canvas, stageEl) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x0b0e1a, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BASE_FOV, FRAME.aspect, 0.1, 200);

  // Tweenable camera rig. Scenes animate `rig`; a gentle drift rides on top.
  const rig = { x: 0, y: 0, z: CAM_Z, lookX: 0, lookY: 0, drift: 1 };
  const uniforms = { uTime: { value: 0 }, uPR: { value: 1 } };
  const updaters = new Set();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    // Point sizes are authored in 1920×1080 stage pixels.
    uniforms.uPR.value = pr * Math.min(w / FRAME.w, h / FRAME.h);
    const aspect = w / h;
    camera.aspect = aspect;
    // Wider than 16:9 → keep vertical FOV. Narrower → widen so the frame width fits.
    camera.fov =
      aspect >= FRAME.aspect
        ? BASE_FOV
        : THREE.MathUtils.radToDeg(
            2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * (FRAME.aspect / aspect)),
          );
    camera.updateProjectionMatrix();

    const s = Math.min(w / FRAME.w, h / FRAME.h);
    stageEl.style.transform = `translate(${-FRAME.w * s * 0.5}px, ${-FRAME.h * s * 0.5}px) scale(${s})`;
  }
  resize();
  window.addEventListener('resize', resize);

  const target = new THREE.Vector3();
  function render(time) {
    uniforms.uTime.value = time;
    const d = rig.drift;
    camera.position.set(
      rig.x + Math.sin(time * 0.11) * 0.06 * d,
      rig.y + Math.sin(time * 0.083 + 1.3) * 0.04 * d,
      rig.z,
    );
    target.set(rig.lookX, rig.lookY, 0);
    camera.lookAt(target);
    for (const fn of updaters) fn(time);
    renderer.render(scene, camera);
  }
  gsap.ticker.add((time) => render(time));

  return {
    renderer,
    scene,
    camera,
    rig,
    uniforms,
    onFrame(fn) {
      updaters.add(fn);
      return () => updaters.delete(fn);
    },
  };
}

// Dispose every geometry/material under an object and detach it.
export function disposeObject(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
  obj.removeFromParent();
}
