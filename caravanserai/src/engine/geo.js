// Stylised outlines (hand-simplified, not survey-accurate) projected into
// 1920×1080 stage pixels. Used both for particle shapes and SVG overlays.

// Uzbekistan, simplified: [lon, lat].
export const UZBEKISTAN = [
  [56.0, 45.0], [58.5, 45.6], [60.0, 44.6], [61.1, 44.2], [62.0, 43.5], [64.9, 43.7],
  [65.8, 42.9], [66.1, 42.0], [66.6, 42.0], [66.7, 41.2], [68.1, 40.7], [68.6, 40.6],
  [69.2, 41.5], [70.4, 42.0], [70.9, 42.25], [71.2, 41.8], [70.4, 41.4], [71.6, 41.5],
  [72.2, 41.1], [73.1, 40.9], [72.8, 40.5], [71.8, 40.2], [70.9, 40.2], [70.5, 40.9],
  [69.6, 40.3], [69.3, 40.0], [68.6, 39.5], [67.7, 37.2], [67.0, 37.3], [66.5, 37.4],
  [66.6, 38.0], [65.6, 38.6], [64.2, 38.9], [63.5, 39.5], [62.4, 40.0], [61.9, 41.1],
  [60.5, 41.2], [60.0, 42.0], [58.6, 42.7], [57.9, 42.4], [57.0, 41.3], [56.0, 41.3],
];

// Aral Sea as it was in 1960, simplified.
export const ARAL = [
  [59.2, 46.4], [60.2, 46.7], [61.2, 46.5], [61.9, 45.9], [61.7, 45.0], [61.0, 44.2],
  [60.2, 43.6], [59.4, 43.6], [58.7, 44.2], [58.3, 45.0], [58.5, 45.9],
];

// Equirectangular with cos(lat) scaling, fitted to the right of the frame.
const LON0 = 64.6;
const LAT0 = 41.9;
const K = 80; // px per degree of latitude
const COS = Math.cos((LAT0 * Math.PI) / 180);
export const MAP_CENTER = [1290, 560];

export function project([lon, lat]) {
  return [MAP_CENTER[0] + (lon - LON0) * K * COS, MAP_CENTER[1] - (lat - LAT0) * K];
}

export function pathD(poly) {
  return poly.map((p, i) => `${i ? 'L' : 'M'} ${project(p).map((v) => v.toFixed(1)).join(' ')}`).join(' ') + ' Z';
}
