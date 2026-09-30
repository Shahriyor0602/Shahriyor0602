import * as THREE from 'three';

// Procedural asphalt (PBR) with lane markings and progressive cracking.
// Geometry supplies `roadUV` (u lateral, v along, metres) and `edgeDist`
// (distance to a slab fracture edge; large on continuous road).
export function makeRoadMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 roadUV;
        attribute float edgeDist;
        varying vec2 vRoadUV;
        varying float vEdge;`
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUV = roadUV;\nvEdge = edgeDist;');

    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vRoadUV;
        varying float vEdge;
        uniform float uDamage;
        uniform float uZoneCrack;
        uniform float uZoneV0;
        uniform float uZoneV1;
        float rh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 rh2(vec2 p) {
          return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
        }
        float vn(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(rh(i), rh(i + vec2(1, 0)), u.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float s = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; }
          return s;
        }
        // Distance to the nearest Voronoi cell border (Inigo Quilez).
        float vEdgeDist(vec2 x) {
          vec2 n = floor(x); vec2 f = fract(x);
          vec2 mg, mr; float md = 8.0;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j)); vec2 o = rh2(n + g); vec2 r = g + o - f;
            float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; }
          }
          md = 8.0;
          for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
            vec2 g = mg + vec2(float(i), float(j)); vec2 o = rh2(n + g); vec2 r = g + o - f;
            if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
          }
          return md;
        }
        float aaLine(float d, float w) { float fw = fwidth(d) * 1.2; return 1.0 - smoothstep(w - fw, w + fw, d); }
        float gCrack; float gRough;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec2 p = vRoadUV;
          float au = abs(p.x);
          float big = fbm(p * vec2(0.35, 0.12));
          float mid = vn(p * 3.1);
          float fine = vn(p * 17.0);
          float fadeFine = 1.0 - smoothstep(0.05, 0.25, fwidth(p.y) * 17.0);
          vec3 col = vec3(0.078, 0.08, 0.084) * (0.78 + 0.42 * big + 0.16 * mid + 0.22 * (fine - 0.5) * fadeFine);
          // Polished wheel paths.
          float track = exp(-pow((abs(au - 1.8) - 0.82) / 0.3, 2.0));
          col *= 1.0 - 0.1 * track;
          gRough = 0.9 - 0.14 * track;
          // Concrete curb strip beyond the shoulder.
          float curb = smoothstep(4.62, 4.66, au);
          col = mix(col, vec3(0.3, 0.295, 0.285) * (0.85 + 0.3 * mid), curb);
          // Markings: solid edge lines and a dashed centre line.
          float wear = 0.72 + 0.28 * smoothstep(0.25, 0.7, vn(p * vec2(4.0, 1.3)));
          float edge = aaLine(abs(au - 3.62), 0.075);
          float dash = step(mod(p.y + 3.0, 12.0), 4.0) * aaLine(au, 0.07);
          float mark = max(edge, dash) * (1.0 - curb);
          col = mix(col, vec3(0.78, 0.78, 0.76) * wear, mark * wear);
          gRough = mix(gRough, 0.62, mark);

          // --- cracking: a network that grows segment by segment as equity erodes
          float zoneNear = 1.0 - smoothstep(0.0, 60.0, max(uZoneV0 - p.y, p.y - uZoneV1));
          float amt = clamp(uDamage * (0.55 + 0.9 * fbm(p * vec2(0.08, 0.035) + 3.0)) + zoneNear * uZoneCrack * 0.5, 0.0, 1.0);
          vec2 q = p + 0.45 * vec2(fbm(p * 0.9) - 0.5, fbm(p * 0.9 + 5.3) - 0.5);
          q += 0.08 * vec2(vn(p * 6.0) - 0.5, vn(p * 6.0 + 2.7) - 0.5);
          // primary cracks: large irregular cells, fragmented by a growth gate
          float e1 = vEdgeDist(q * vec2(0.42, 0.3)) / 0.36;
          float g1 = smoothstep(1.0 - amt * 1.05, 1.08 - amt * 1.05, vn(q * 0.9 + 11.0) * 0.55 + vn(q * 2.3) * 0.45);
          float w1 = (0.004 + 0.016 * amt) * (0.45 + 1.1 * vn(q * 3.7 + 1.0));
          // secondary alligator cracking in the wheel paths
          float e2 = vEdgeDist(q * 2.2 + 7.0) / 2.2;
          float g2 = smoothstep(1.25 - amt, 1.35 - amt, vn(q * 1.2 + 3.0) + 0.45 * track);
          float w2 = (0.002 + 0.006 * amt) * (0.5 + vn(q * 5.0));
          // long transverse cracks
          float tr = abs(fract(q.y / 9.0 + 0.3 * vn(vec2(q.y * 0.1, 0.0))) - 0.5) * 9.0;
          float g3 = smoothstep(0.55, 0.75, vn(vec2(floor(q.y / 9.0 + 0.3) * 3.1, 0.0))) * smoothstep(0.2, 0.7, amt) * smoothstep(0.3, 0.5, vn(q * vec2(0.6, 0.2)));
          float c1 = aaLine(e1, w1) * g1 * step(0.02, amt);
          float c2 = aaLine(e2, w2) * g2 * step(0.02, amt);
          float c3 = aaLine(tr, 0.006 + 0.01 * amt) * g3;
          // fracture lines of the collapse-zone slabs
          float we = 0.003 + 0.022 * uZoneCrack;
          float c4 = aaLine(vEdge, we) * step(0.01, uZoneCrack);
          float halo = max((1.0 - smoothstep(0.0, w1 * 5.0 + 0.001, e1)) * g1 * amt,
                           (1.0 - smoothstep(0.0, we * 4.0, vEdge)) * uZoneCrack);
          col *= 1.0 - 0.28 * halo;
          gCrack = max(max(c1, c2 * 0.8), max(c3, c4));
          col = mix(col, vec3(0.006, 0.006, 0.007), gCrack);
          diffuseColor.rgb *= col;
        }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(gRough, 1.0, gCrack);'
      );
  };
  return mat;
}
