import * as THREE from 'three';

// A low-poly "x-ray" car on a road of tiles, for the Q2 metaphor:
// efficiency = engine, effectiveness = steering, equity = road.
// Everything visible is derived each frame from `state`, so any timeline
// seek lands on the right picture (the road scroll is ambient and cyclic).
const AMBER = new THREE.Color('#e8a33d');
const SAND = new THREE.Color('#d9c7a3');

const ROWS = 20;
const COLS = 3;
const TILE = 0.9;
const LOOP = ROWS * TILE;

export function createCar(stage) {
  const root = new THREE.Group();
  root.position.set(1.7, -1.35, 0);
  root.rotation.y = -0.5;
  stage.scene.add(root);

  const hemi = new THREE.HemisphereLight(0x8a93b8, 0x0b0e1a, 0.9);
  const key = new THREE.DirectionalLight(0xffe2b8, 1.1);
  key.position.set(3, 5, 4);
  root.add(hemi, key);

  const edgeMat = new THREE.LineBasicMaterial({ color: SAND, transparent: true, opacity: 0.85 });
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x1b2138, roughness: 0.6, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.55, depthWrite: false,
  });

  // --- body: extruded side profile --------------------------------------
  const car = new THREE.Group();
  root.add(car);
  const prof = new THREE.Shape();
  [
    [-1.35, 0.22], [-1.38, 0.58], [-0.95, 0.64], [-0.55, 1.0], [0.3, 1.0],
    [0.72, 0.64], [1.3, 0.54], [1.36, 0.22],
  ].forEach(([x, y], i) => (i ? prof.lineTo(x, y) : prof.moveTo(x, y)));
  const bodyG = new THREE.ExtrudeGeometry(prof, { depth: 1.14, bevelEnabled: false });
  bodyG.translate(0, 0, -0.57);
  const body = new THREE.Mesh(bodyG, shellMat);
  const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyG, 20), edgeMat);
  car.add(body, bodyEdges);

  // --- engine: glows through the shell ------------------------------------
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: AMBER, emissiveIntensity: 0, flatShading: true });
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.62), engineMat);
  engine.position.set(0.98, 0.4, 0);
  const engineLight = new THREE.PointLight(AMBER, 0, 4, 1.6);
  engineLight.position.set(1.0, 0.6, 0);
  car.add(engine, engineLight);

  // --- steering wheel inside the cabin -----------------------------------
  const steerMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: AMBER, emissiveIntensity: 0 });
  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), steerMat);
  steer.position.set(0.42, 0.72, 0.26);
  steer.rotation.y = Math.PI / 2;
  steer.rotation.x = -0.4;
  car.add(steer);

  // --- wheels ---------------------------------------------------------------
  const wheelG = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10);
  wheelG.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: AMBER, emissiveIntensity: 0, flatShading: true });
  const wheels = [];
  for (const [x, z] of [[0.85, 0.6], [0.85, -0.6], [-0.85, 0.6], [-0.85, -0.6]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.28, z);
    const spin = new THREE.Group();
    const tyre = new THREE.Mesh(wheelG, shellMat);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(wheelG), edgeMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 6).rotateX(Math.PI / 2), hubMat);
    spin.add(tyre, rim, hub);
    pivot.add(spin);
    car.add(pivot);
    wheels.push({ pivot, spin, front: x > 0 });
  }

  // --- road -----------------------------------------------------------------
  const tileG = new THREE.BoxGeometry(TILE * 0.94, 0.06, TILE * 0.94);
  const tileEdgesG = new THREE.EdgesGeometry(tileG);
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x2b2a2e, emissive: AMBER, emissiveIntensity: 0.05, flatShading: true });
  const tileEdgeMat = new THREE.LineBasicMaterial({ color: SAND, transparent: true, opacity: 0.55 });
  const tiles = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(tileG, tileMat), new THREE.LineSegments(tileEdgesG, tileEdgeMat));
      root.add(g);
      tiles.push({ g, r, c, rand: Math.random() });
    }

  const state = {
    visible: 0, // 0..1 fades the whole car in/out
    engine: 0, // engine glow 0..1
    steer: 0, // steering highlight 0..1
    build: 0, // road assembly 0..1
    speed: 0, // world units per second (ambient scroll)
    fall: 0, // road collapse 0..1
    drop: 0, // car falls 0..1
  };
  let dist = 0;
  let last = null;

  const off = stage.onFrame((time) => {
    const dt = last === null ? 0 : Math.min(time - last, 0.05);
    last = time;
    dist += state.speed * dt;
    const vis = state.visible;
    root.visible = vis > 0.001;
    edgeMat.opacity = 0.85 * vis * (1 - state.drop);
    shellMat.opacity = 0.55 * vis * (1 - state.drop);
    tileEdgeMat.opacity = 0.55 * vis;

    // Engine and steering glows (with a slow pulse once lit).
    const pulse = 0.85 + 0.15 * Math.sin(time * 3.2);
    engineMat.emissiveIntensity = 2.6 * state.engine * pulse;
    engineLight.intensity = 6 * state.engine * pulse * (1 - state.drop);
    steerMat.emissiveIntensity = 2.2 * state.steer;
    hubMat.emissiveIntensity = 1.6 * state.steer;

    // Wheels spin with distance; front wheels steer gently once highlighted.
    const steerAngle = Math.sin(time * 0.9) * 0.28 * state.steer;
    for (const w of wheels) {
      w.spin.rotation.z = -dist / 0.28;
      w.pivot.rotation.y = w.front ? steerAngle : 0;
    }
    steer.rotation.z = steerAngle * 2.5;

    // Car drops into darkness, nose first.
    car.position.y = -5 * state.drop * state.drop;
    car.rotation.z = -0.5 * state.drop;

    // Tiles: scroll under the car, build outward from it, collapse front → back.
    for (const t of tiles) {
      let x = ((t.r * TILE - dist) % LOOP + LOOP) % LOOP - LOOP / 2;
      const z = (t.c - 1) * TILE;
      const near = Math.min(Math.abs(x) / (LOOP / 2), 1);
      const b = Math.min(Math.max(state.build * 1.6 - near * 0.8 - t.rand * 0.1, 0), 1);
      const order = (LOOP / 2 - x) / LOOP; // 0 = far ahead, 1 = far behind
      const f = Math.min(Math.max(state.fall * 1.7 - order * 0.9 - t.rand * 0.15, 0), 1);
      t.g.position.set(x, -1.2 * (1 - b) - 6 * f * f, z);
      t.g.rotation.set(f * (t.rand - 0.5) * 2, 0, f * (t.rand - 0.3) * 2.5);
      const s = b * (1 - f * 0.3);
      t.g.scale.setScalar(Math.max(s, 0.0001));
      t.g.visible = b > 0.01 && f < 0.99;
    }
  });

  return {
    state,
    dispose() {
      off();
      root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) o.material.dispose();
      });
      root.removeFromParent();
    },
  };
}
