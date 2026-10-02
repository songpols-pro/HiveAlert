// ALLIED structures — Hymenoptera & Elytra Bio-Tech (polished iridescent chitin, amber resin, gold fittings).
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { mulberry32 } from '../../core/util.js';
import { PartBuilder, pivot, marker, eyes, chain, spikes, comb, sacs, stilts, ribs, plates, antennae } from '../insectKit.js';

const F = 'allied';

/** Maternal Spire (Construction Yard) — 3×3, h 3.2. Royal wasp cyst on calcified chitin stilts. */
export function buildMaternalSpire(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // hardened nest pad with resin rim
  b.dome(m.mud, 1.42, 0.2, 1.42, 0, 0, 0, 16);
  b.torus(m.resin, 1.28, 0.05, 4, 22, 0, 0.07, 0, Math.PI / 2, 0, 0);
  b.torus(m.team, 1.1, 0.03, 4, 22, 0, 0.12, 0, Math.PI / 2, 0, 0);
  // calcified chitin stilts cradling the cyst
  stilts(b, m.bone, 0, 0, 0.72, 6, 1.3, 0.07, 0.5, m.chitinLight, 0.3);
  // fungal brood tendrils seeding the base plots
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.9;
    const c = Math.cos(a), s = Math.sin(a);
    chain(b, m.flesh, [[c * 0.5, 1.35, s * 0.5, 0.05], [c * 0.95, 0.75, s * 0.95, 0.04], [c * 1.25, 0.25, s * 1.25, 0.03], [c * 1.4, 0.12, s * 1.4, 0.02]], 5);
  }
  // cradle cup under the cyst
  b.dome(m.chitinDark, 0.82, 0.32, 0.82, 0, 1.18, 0, 14, Math.PI, 0, 0);
  b.torus(m.metal, 0.8, 0.04, 4, 20, 0, 1.2, 0, Math.PI / 2, 0, 0);
  // brood hatch comb at the front between stilts
  comb(b, m.chitinDark, m.organ, 0, 0.55, 0.62, 3, 3, 0.2, 0.12, 'z');
  b.box(m.chitinDark, 0.62, 0.66, 0.12, 0, 0.55, 0.55);
  root.add(b.build());

  // the pulsing maternal cyst
  const cy = new PartBuilder();
  cy.ellipsoid(m.chitin, 0.78, 1.0, 0.78, 0, 0, 0, 16);
  for (let i = 0; i < 4; i++) {
    const y = -0.55 + i * 0.36;
    const r = Math.sqrt(Math.max(0.01, 1 - (y / 1.0) ** 2)) * 0.8;
    cy.torus(i === 1 ? m.team : m.chitinLight, r, 0.035, 4, 20, 0, y, 0, Math.PI / 2, 0, 0);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cy.taper(m.organ, [Math.cos(a) * 0.7, -0.45, Math.sin(a) * 0.7], [Math.cos(a) * 0.55, 0.62, Math.sin(a) * 0.55], 0.03, 0.014, 4);
  }
  sacs(cy, m.resin, 0, -0.75, 0, 6, 0.1, 0.5, 3);
  root.add(pivot('pulseCyst', cy, 0, 1.95, 0));

  // spire tip, golden crown and pheromone emitters
  const tb = new PartBuilder();
  tb.taper(m.chitinLight, [0, 2.75, 0], [0, 3.25, 0], 0.24, 0.02, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    tb.taper(m.metal, [Math.cos(a) * 0.22, 2.82, Math.sin(a) * 0.22], [Math.cos(a) * 0.4, 3.05, Math.sin(a) * 0.4], 0.04, 0.005, 4);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const x = Math.cos(a) * 0.62, z = Math.sin(a) * 0.62;
    chain(tb, m.chitinDark, [[x * 0.9, 2.3, z * 0.9, 0.035], [x * 1.25, 2.65, z * 1.25, 0.025], [x * 1.35, 2.95, z * 1.35, 0.015]], 5);
    tb.ellipsoid(m.organ, 0.05, 0.05, 0.05, x * 1.35, 2.98, z * 1.35, 6);
  }
  root.add(tb.build());
  root.add(marker('smoke', 0, 3.2, 0));
  return root;
}

// ------------------------------------------------------------------ local helpers
const TAU = Math.PI * 2;
const HP = Math.PI / 2;
const _eu = new THREE.Euler();
const _qu = new THREE.Quaternion();
const _mx = new THREE.Matrix4();
const _pv = new THREE.Vector3();
const _sv = new THREE.Vector3();

/** Add any geometry: scale, then roll (Z), pitch (X), yaw (Y), then translate. */
function put(b, mat, geo, x, y, z, pitch = 0, yaw = 0, roll = 0, sx = 1, sy = 1, sz = 1) {
  _eu.set(pitch, yaw, roll, 'YXZ');
  _qu.setFromEuler(_eu);
  _mx.compose(_pv.set(x, y, z), _qu, _sv.set(sx, sy, sz));
  return b.addMatrix(mat, geo, _mx);
}
const sph = (seg = 8) => new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg * 0.65)));
const half = (seg = 8) => new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg / 2)), 0, TAU, 0, HP);
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Surface of revolution from [[radius, y], …]. Visible side is right of travel: go up the outside, inward over tops, rim → centre on dishes. */
function lathe(b, mat, pts, seg, x = 0, y = 0, z = 0, phase = 0) {
  return b.add(mat, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg, phase), [x, y, z]);
}
/** Radius of a [[r, y], …] profile at height y (linear). */
function profR(pts, y) {
  for (let i = 1; i < pts.length; i++) {
    const [r0, y0] = pts[i - 1], [r1, y1] = pts[i];
    if ((y - y0) * (y - y1) <= 0 && y1 !== y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return pts[pts.length - 1][0];
}
/** Horizontal ring. seg 6 = hex ring matching a flat-front hex prism (cyl ry π/6); seg 8 + spin π/8 = flat-front octagon. */
function ring(b, mat, r, tube, y, seg = 16, x = 0, z = 0, spin = 0, arc = TAU) {
  return b.torus(mat, r, tube, 3, seg, x, y, z, HP, 0, spin, arc);
}
/** n gold studs / rivets ringed at radius r. */
function studs(b, mat, r, y, n, size = 0.03, phase = 0, x = 0, z = 0) {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    b.ellipsoid(mat, size, size * 0.75, size, x + Math.cos(a) * r, y, z + Math.sin(a) * r, 5);
  }
}
/** Flat-front hex plinth with a team band round its flank and a gold rim on top. */
function hexPlinth(b, m, r, h) {
  b.cyl(m.chitinDark, r * 0.94, r, h, 6, 0, h / 2, 0, 0, Math.PI / 6, 0);
  ring(b, m.team, r * 0.985, 0.04, h * 0.42, 6);
  ring(b, m.metal, r * 0.92, 0.028, h, 6);
}
/** Point in a yawed local frame (u right, v up, w forward). */
function yawPt(x, y, z, yaw, u, v, w) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x + u * c + w * s, y + v, z - u * s + w * c];
}
/** Flat chevron marking whose apex sits at (x, z) and points along angle a (0 = +X, π/2 = +Z). */
function chevron(b, mat, x, y, z, a, size = 0.24, w = 0.07, h = 0.012) {
  const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
  for (const k of [-1, 1]) {
    const vx = -dx + k * px, vz = -dz + k * pz;
    b.box(mat, size, h, w, x + vx * size * 0.35, y, z + vz * size * 0.35, 0, Math.atan2(-vz, vx), 0);
  }
}
/** Flat dock / exit apron (y ≤ 0.05) with gold edging and team chevrons (dir +1 points out, −1 points at the building). */
function apron(b, m, x, z, w, d, dir = 1) {
  b.box(m.chitinDark, w, 0.024, d, x, 0.012, z);
  for (const s of [-1, 1]) {
    b.box(m.metal, w, 0.014, 0.05, x, 0.03, z + s * (d / 2 - 0.025));
    b.box(m.metal, 0.05, 0.014, d - 0.1, x + s * (w / 2 - 0.025), 0.03, z);
    b.box(m.team, 0.05, 0.012, d * 0.6, x + s * (w / 2 - 0.1), 0.03, z);
  }
  for (const k of [-0.16, 0.16]) chevron(b, m.team, x, 0.03, z + k + dir * 0.06, dir > 0 ? HP : -HP, 0.3, 0.075);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(m.metal, 0.035, 0.04, 0.02, 6, x + sx * (w / 2 - 0.1), 0.035, z + sz * (d / 2 - 0.1));
}
/**
 * Static wing / vane polygon from root `o` along unit span `d`, chord axis `c` (unit).
 * Returns P(t, k): point at span fraction t, offset k along the chord.
 */
function vane(b, mat, o, d, c, len, width, veinMat = null, veinR = 0.012) {
  const P = (t, k) => [o[0] + d[0] * len * t + c[0] * k, o[1] + d[1] * len * t + c[1] * k, o[2] + d[2] * len * t + c[2] * k];
  const W = (t) => width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.7);
  const pts = [o];
  const N = 8;
  for (let i = 1; i <= N; i++) pts.push(P(i / N, W(i / N) * 0.35));
  for (let i = N; i >= 1; i--) pts.push(P(i / N, -W(i / N) * 0.65));
  b.polygon(mat, pts);
  if (veinMat) {
    b.taper(veinMat, o, P(0.97, W(0.97) * 0.3), veinR, veinR * 0.3, 4);
    b.taper(veinMat, o, P(0.85, -W(0.85) * 0.25), veinR * 0.7, veinR * 0.25, 3);
  }
  return P;
}
/** Allied firefly: glowing lantern abdomen, dark elytra, team pronotum shield. Head faces `yaw`. */
function firefly(b, m, x, y, z, yaw = 0, s = 1, wingsOn = false) {
  const P = (u, v, w) => yawPt(x, y, z, yaw, u * s, v * s, w * s);
  b.ellipsoid(m.organ, 0.032 * s, 0.028 * s, 0.05 * s, ...P(0, -0.004, -0.035), 6, 0, yaw, 0);
  b.ellipsoid(m.chitinDark, 0.03 * s, 0.02 * s, 0.045 * s, ...P(0, 0.016, -0.005), 6, 0, yaw, 0);
  b.ellipsoid(m.team, 0.024 * s, 0.015 * s, 0.02 * s, ...P(0, 0.012, 0.04), 5, 0, yaw, 0);
  if (wingsOn) {
    for (const k of [-1, 1]) {
      b.polygon(m.membrane, [P(k * 0.012, 0.03, 0.01), P(k * 0.085, 0.05, -0.02), P(k * 0.08, 0.045, -0.06), P(k * 0.02, 0.03, -0.03)]);
    }
  }
}
/** Roosting Allied wasp: teal thorax, team/dark banded abdomen, folded membrane wings. Head faces `yaw`. */
function wasp(b, m, x, y, z, yaw = 0, s = 1) {
  const P = (u, v, w) => yawPt(x, y, z, yaw, u * s, v * s, w * s);
  b.ellipsoid(m.chitin, 0.04 * s, 0.038 * s, 0.05 * s, ...P(0, 0.075, 0.02), 6, 0, yaw, 0);
  b.ellipsoid(m.chitinLight, 0.034 * s, 0.032 * s, 0.03 * s, ...P(0, 0.085, 0.085), 6, 0, yaw, 0);
  for (const k of [-1, 1]) {
    b.ellipsoid(m.eye, 0.017 * s, 0.022 * s, 0.017 * s, ...P(k * 0.026, 0.09, 0.098), 5);
    b.taper(m.chitinDark, P(k * 0.012, 0.11, 0.105), P(k * 0.045, 0.16, 0.15), 0.006 * s, 0.003 * s, 3);
    b.polygon(m.membrane, [P(k * 0.015, 0.105, 0.03), P(k * 0.065, 0.115, -0.08), P(k * 0.05, 0.11, -0.17), P(k * 0.012, 0.1, -0.06)]);
    for (let i = 0; i < 3; i++) {
      const w = 0.045 - i * 0.035;
      const knee = P(k * 0.075, 0.035, w + 0.01);
      b.taper(m.chitinDark, P(k * 0.03, 0.06, w), knee, 0.007 * s, 0.006 * s, 3);
      b.taper(m.chitinDark, knee, P(k * 0.09, 0.0, w + (1 - i) * 0.03), 0.006 * s, 0.003 * s, 3);
    }
  }
  for (const [w, r, mat] of [[-0.045, 0.04, m.team], [-0.095, 0.042, m.chitinDark], [-0.145, 0.034, m.team]]) {
    put(b, mat, sph(7), ...P(0, 0.065 + w * 0.3, w), -0.3, yaw, 0, r * s, r * 0.9 * s, 0.038 * s);
  }
  b.taper(m.chitinDark, P(0, 0.025, -0.18), P(0, 0.005, -0.22), 0.012 * s, 0.002 * s, 4);
}
/** Static cleaner mite (Macrocheles): tan body, dark dorsal shield, 8 legs. Faces `yaw`. */
function mite(b, m, x, y, z, yaw = 0, s = 1) {
  const P = (u, v, w) => yawPt(x, y, z, yaw, u * s, v * s, w * s);
  b.ellipsoid(m.flesh, 0.06 * s, 0.04 * s, 0.075 * s, ...P(0, 0.045, 0), 7, 0, yaw, 0);
  b.dome(m.chitinDark, 0.055 * s, 0.03 * s, 0.066 * s, ...P(0, 0.06, -0.005), 6, 0, yaw, 0);
  b.ellipsoid(m.chitinDark, 0.025 * s, 0.02 * s, 0.025 * s, ...P(0, 0.04, 0.075), 5, 0, yaw, 0);
  b.ellipsoid(m.organ, 0.012 * s, 0.012 * s, 0.012 * s, ...P(0, 0.055, 0.09), 4);
  for (const k of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const w = 0.045 - i * 0.03, fw = i < 2 ? 0.04 : -0.04;
      const knee = P(k * 0.09, 0.07, w + fw * 0.6);
      b.taper(m.chitinDark, P(k * 0.045, 0.045, w), knee, 0.009 * s, 0.007 * s, 3);
      b.taper(m.chitinDark, knee, P(k * 0.12, 0.0, w + fw * (i === 0 ? 2 : 1.2)), 0.007 * s, 0.003 * s, 3);
    }
  }
}
/** Curled repair larva re-secreting a resin plate. Head faces `yaw`. */
function grub(b, m, x, y, z, yaw = 0, s = 1) {
  const P = (u, v, w) => yawPt(x, y, z, yaw, u * s, v * s, w * s);
  for (let i = 0; i < 5; i++) {
    const th = -1.3 + (i / 4) * 2.6, r = (0.036 - Math.abs(i - 2) * 0.004) * s;
    b.ellipsoid(i === 2 ? m.team : i % 2 ? m.flesh : m.bone, r, r * 0.9, r, ...P(Math.sin(th) * 0.075, 0.032, Math.cos(th) * 0.075 - 0.04), 6);
  }
  b.ellipsoid(m.chitinDark, 0.024 * s, 0.022 * s, 0.024 * s, ...P(0.076, 0.03, -0.055), 5);
  b.ellipsoid(m.resin, 0.05 * s, 0.016 * s, 0.04 * s, ...P(0.1, 0.012, -0.1), 6);
  b.dome(m.chitinLight, 0.035 * s, 0.012 * s, 0.03 * s, ...P(0.1, 0.022, -0.1), 6, 0, yaw, 0);
}

// ------------------------------------------------------------------ structures

/** Luminescent Firefly Hive (power plant) — 2×2, h 2.0. Amber honeycomb tower full of fireflies round a throbbing photocyte core. */
export function buildFireflyHive(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(11);
  hexPlinth(b, m, 0.97, 0.16);
  studs(b, m.metal, 0.8, 0.17, 6, 0.035, Math.PI / 6);
  // chitin collar
  b.cyl(m.chitin, 0.64, 0.74, 0.24, 6, 0, 0.28, 0, 0, Math.PI / 6, 0);
  ring(b, m.metal, 0.66, 0.026, 0.4, 6);
  // luciferin conduits feeding the plinth: gold pipes ending in glow nodes
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 6 + (i / 3) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.metal, [[c * 0.6, 0.36, s * 0.6, 0.04], [c * 0.78, 0.3, s * 0.78, 0.034], [c * 0.86, 0.19, s * 0.86, 0.03]], 5, false);
    b.ellipsoid(m.organ, 0.05, 0.035, 0.05, c * 0.86, 0.19, s * 0.86, 6);
  }
  // translucent amber honeycomb wrapped round the core (pointy-top hex cells, radial)
  const RHO = 0.56, N = 12, R = (TAU * RHO) / (N * Math.sqrt(3)), DEPTH = 0.13;
  for (let row = 0; row < 4; row++) {
    const y = 0.56 + row * R * 1.5;
    for (let j = 0; j < N; j++) {
      const a = ((j + (row % 2) * 0.5) / N) * TAU, c = Math.cos(a), s = Math.sin(a), yaw = HP - a;
      put(b, m.resin, new THREE.CylinderGeometry(R * 0.9, R * 0.9, DEPTH, 6), c * RHO, y, s * RHO, HP, yaw);
      const roll = rng();
      const out = RHO + DEPTH / 2;
      if (roll < 0.2) put(b, m.metal, new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.02, 6), c * out, y, s * out, HP, yaw);
      else if (roll < 0.42) firefly(b, m, c * (out + 0.02), y, s * (out + 0.02), yaw, 1.1);
    }
  }
  // chitin ribs at the hex corners with gold clamps, team bands top and bottom
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinLight, [[c * 0.7, 0.38, s * 0.7, 0.05], [c * 0.76, 0.95, s * 0.76, 0.042], [c * 0.7, 1.52, s * 0.7, 0.04]], 6, false);
    b.ellipsoid(m.metal, 0.06, 0.075, 0.06, c * 0.765, 0.95, s * 0.765, 6);
  }
  ring(b, m.team, 0.72, 0.045, 0.44, 6);
  ring(b, m.team, 0.72, 0.045, 1.46, 6);
  // hexagonal chitin roof with gold ridges
  b.dome(m.chitin, 0.76, 0.24, 0.76, 0, 1.48, 0, 6);
  ring(b, m.metal, 0.75, 0.03, 1.49, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.metal, [c * 0.74, 1.5, s * 0.74], [c * 0.2, 1.71, s * 0.2], 0.03, 0.018, 4);
  }
  // membrane lantern cupola, gold cap and finial
  b.cyl(m.membrane, 0.19, 0.19, 0.26, 6, 0, 1.84, 0, 0, Math.PI / 6, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    b.strut(m.metal, [Math.cos(a) * 0.19, 1.7, Math.sin(a) * 0.19], [Math.cos(a) * 0.19, 1.98, Math.sin(a) * 0.19], 0.018, 4);
  }
  b.cone(m.metal, 0.23, 0.13, 6, 0, 2.03, 0, 0, Math.PI / 6, 0);
  b.taper(m.metal, [0, 2.08, 0], [0, 2.24, 0], 0.025, 0.004, 4);
  root.add(b.build());

  // throbbing photocyte core seen through the amber cells
  const core = new PartBuilder();
  core.cyl(m.organ, 0.44, 0.44, 1.08, 6, 0, 0, 0, 0, Math.PI / 6, 0);
  root.add(pivot('pulseCore', core, 0, 0.95, 0));
  const lan = new PartBuilder();
  lan.ellipsoid(m.organ, 0.11, 0.1, 0.11, 0, 0, 0, 8);
  root.add(pivot('pulseLantern', lan, 0, 1.84, 0));

  // a synchronised swarm circling the hive
  const fl = new PartBuilder();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3, rr = 0.84 + (i % 2) * 0.06;
    firefly(fl, m, Math.cos(a) * rr, 0.7 + ((i * 3) % 7) * 0.15, Math.sin(a) * rr, Math.PI - a, 1.25, true);
  }
  const flies = pivot('spinYFlies', fl);
  flies.userData.speed = 0.7;
  root.add(flies);
  return root;
}

/** Digestive Chitin Mound (refinery) — 3×3, h 2.4, dock in front. Termite mound with an open gastric pit churning enzymes. */
export function buildDigestiveMound(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const Z = -0.08; // mound centre, nudged back to leave room for the intake chute
  b.dome(m.mud, 1.5, 0.12, 1.48, 0, 0, Z, 14);
  // the mound, crowned by the gastric crater (outside up, over the rim, down into the pit)
  lathe(b, m.mud, [[1.36, 0.04], [1.3, 0.32], [1.15, 0.64], [0.99, 0.94], [0.9, 1.06], [0.8, 1.1], [0.72, 1.02], [0.68, 0.84], [0.64, 0.7]], 14, 0, 0, Z);
  b.cyl(m.acid, 0.67, 0.6, 0.05, 14, 0, 0.7, Z);
  // fluted termite-mud ridges and lumps (front left clear for the chute)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.35;
    if (Math.sin(a) > 0.85) continue;
    const c = Math.cos(a), s = Math.sin(a);
    b.taper(m.mud, [c * 1.36, 0.04, Z + s * 1.36], [c * 1.0, 0.95, Z + s * 1.0], 0.1, 0.05, 5);
  }
  sacs(b, m.mud, -0.95, 0.3, Z + 0.55, 4, 0.15, 0.25, 4);
  sacs(b, m.mud, 0.95, 0.3, Z - 0.55, 4, 0.15, 0.25, 9);
  // crater lips: chitin rim, gold inner band, team band, rivets
  ring(b, m.chitinLight, 0.8, 0.06, 1.09, 16, 0, Z);
  ring(b, m.metal, 0.7, 0.025, 1.0, 16, 0, Z);
  ring(b, m.team, 1.0, 0.05, 0.93, 16, 0, Z);
  ring(b, m.team, 1.33, 0.05, 0.3, 16, 0, Z);
  studs(b, m.metal, 0.8, 1.15, 10, 0.03, 0.2, 0, Z);
  // termite chimneys on the back of the rim, glowing vents
  const spire = (x, z, y0, h, r0) => {
    const pts = [[r0, 0], [r0 * 0.9, h * 0.25], [r0 * 0.62, h * 0.58], [r0 * 0.4, h * 0.82], [r0 * 0.28, h * 0.95], [r0 * 0.22, h]];
    lathe(b, m.mud, pts, 8, x, y0, z);
    ring(b, m.chitinDark, profR(pts, h * 0.45) + 0.01, 0.03, y0 + h * 0.45, 8, x, z);
    ring(b, m.metal, r0 * 0.24, 0.022, y0 + h, 8, x, z);
    b.cyl(m.organ, r0 * 0.2, r0 * 0.2, 0.02, 8, x, y0 + h - 0.01, z);
  };
  spire(-0.585, Z - 0.75, 0.7, 1.62, 0.34);
  spire(0.62, Z - 0.74, 0.6, 1.2, 0.28);
  spire(-0.99, Z + 0.09, 0.45, 1.05, 0.24);
  // polished chitin flying buttresses bracing the mound
  for (const a of [0.25, 2.9, 3.75, 4.71, 5.6]) {
    const c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitin, [[c * 1.5, 0.03, Z + s * 1.5, 0.085], [c * 1.48, 0.42, Z + s * 1.48, 0.075], [c * 1.3, 0.82, Z + s * 1.3, 0.06], [c * 1.02, 1.04, Z + s * 1.02, 0.045]], 6, false);
    b.dome(m.metal, 0.11, 0.06, 0.11, c * 1.5, 0, Z + s * 1.5, 6);
    b.ellipsoid(m.metal, 0.055, 0.055, 0.055, c * 1.3, 0.82, Z + s * 1.3, 5);
    b.ellipsoid(m.team, 0.07, 0.11, 0.04, c * 1.5, 0.45, Z + s * 1.5, 6, 0, HP - a, 0);
  }
  // teal carapace scutes armouring the mound shoulders, gold-riveted
  for (const a of [0.9, 2.3, 4.0, 5.15, 6.05]) {
    const c = Math.cos(a), s = Math.sin(a);
    put(b, m.chitin, half(8), c * 1.2, 0.5, Z + s * 1.2, HP - 0.44, HP - a, 0, 0.2, 0.06, 0.24);
    put(b, m.chitinLight, half(6), c * 1.0, 0.92, Z + s * 1.0, HP - 0.6, HP - a, 0, 0.12, 0.04, 0.1);
    b.ellipsoid(m.metal, 0.03, 0.03, 0.03, c * 1.27, 0.55, Z + s * 1.27, 4);
  }
  // intake chute from the dock pad up into the pit (kept behind the dock tile), gold rails, bile slurry
  const ang = Math.atan2(0.86, 0.62), len = Math.hypot(0.86, 0.62);
  const ny = Math.cos(ang), nz = Math.sin(ang);
  const cy = 0.59, cz = 1.09;
  b.box(m.chitinDark, 0.46, 0.06, len, 0, cy, cz, ang, 0, 0);
  b.box(m.acid, 0.3, 0.02, len * 0.94, 0, cy + ny * 0.035, cz + nz * 0.035, ang, 0, 0);
  for (const sx of [-1, 1]) {
    b.box(m.metal, 0.045, 0.1, len, sx * 0.23, cy + ny * 0.04, cz + nz * 0.04, ang, 0, 0);
    b.strut(m.chitin, [sx * 0.2, 0, 1.12], [sx * 0.2, 0.52, 1.12], 0.035, 5);
    b.strut(m.chitin, [sx * 0.2, 0, 1.33], [sx * 0.2, 0.24, 1.33], 0.035, 5);
  }
  // dock apron for the Scarab Harvester
  apron(b, m, 0, 2.0, 1.0, 0.96, -1);
  root.add(b.build());

  // churning enzymatic swirl in the pit, with dissolving ore nodules
  const sw = new PartBuilder();
  for (const [r, mat, st] of [[0.2, m.organ, 0], [0.34, m.acid, 2.1], [0.48, m.organ, 4.2], [0.58, m.acid, 1.0]]) {
    sw.torus(mat, r, 0.028, 3, 10, 0, 0, 0, HP, 0, st, 2.4);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    sw.box(m.chitinLight, 0.34, 0.05, 0.05, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3, 0, -a, 0);
  }
  const rng = mulberry32(31);
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU, d = 0.2 + rng() * 0.36;
    if (i % 2) sw.octa(m.crystal, 0.055, Math.cos(a) * d, 0.01, Math.sin(a) * d, 1, 1.3, 1, rng(), rng(), 0);
    else sw.ellipsoid(m.organ, 0.035, 0.03, 0.035, Math.cos(a) * d, 0.0, Math.sin(a) * d, 5);
  }
  const swirl = pivot('spinYSwirl', sw, 0, 0.74, Z);
  swirl.userData.speed = 1.3;
  root.add(swirl);
  root.add(marker('smoke', -0.585, 2.36, Z - 0.75));
  root.add(marker('smoke2', 0, 0.85, Z));
  return root;
}

/** Brood Hatchery (barracks) — 2×2, h 1.8, exit front-left. Humid domed nursery with membranous incubation pods. */
export function buildBroodHatchery(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const DX = -0.45, DZ = -0.12; // DX: door over the exit tile column · DZ: dome centre
  b.cyl(m.mud, 0.95, 0.98, 0.06, 14, 0, 0.03, 0);
  ring(b, m.team, 0.94, 0.03, 0.055, 18);
  // onion-domed nursery shell, chitinLight ribs on the lathe ridges
  const prof = [[0.8, 0.04], [0.85, 0.3], [0.8, 0.62], [0.66, 0.92], [0.44, 1.14], [0.2, 1.26], [0, 1.3]];
  lathe(b, m.chitin, prof, 12, 0, 0, DZ);
  for (let i = 0; i < 6; i++) {
    if (i === 2) continue; // keep the porch clear
    const a = (i / 6) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinLight, prof.slice(1, 6).map(([r, y]) => [c * r * 1.025, y, DZ + s * r * 1.025, 0.032]), 4, false);
  }
  ring(b, m.team, 0.86, 0.04, 0.32, 12, 0, DZ);
  ring(b, m.metal, 0.68, 0.03, 0.9, 12, 0, DZ);
  studs(b, m.metal, 0.82, 0.1, 10, 0.03, 0.15, 0, DZ);
  // embedded incubation blisters: translucent membrane, larva and glow inside, gold frames, mucus drips
  for (const deg of [165, -145, -95, -45, 5]) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const py = 0.56;
    b.ellipsoid(m.membrane, 0.17, 0.21, 0.17, c * 0.8, py, DZ + s * 0.8, 8);
    b.ellipsoid(m.flesh, 0.075, 0.11, 0.065, c * 0.85, py - 0.02, DZ + s * 0.85, 6, 0.4, HP - a, 0);
    b.ellipsoid(m.organ, 0.04, 0.04, 0.04, c * 0.87, py + 0.08, DZ + s * 0.87, 5);
    put(b, m.metal, new THREE.TorusGeometry(0.17, 0.022, 3, 10), c * 0.83, py, DZ + s * 0.83, 0, HP - a, 0, 1, 1.2, 1);
    b.taper(m.resin, [c * 0.86, py - 0.2, DZ + s * 0.86], [c * 0.9, 0.08, DZ + s * 0.9], 0.03, 0.05, 5);
  }
  // crown vent with a misting membrane bulb and two sensory antennae
  ring(b, m.metal, 0.2, 0.03, 1.27, 12, 0, DZ);
  b.ellipsoid(m.membrane, 0.15, 0.13, 0.15, 0, 1.33, DZ, 8);
  b.ellipsoid(m.organ, 0.07, 0.07, 0.07, 0, 1.33, DZ, 6);
  for (const k of [-1, 1]) {
    chain(b, m.chitinDark, [[k * 0.1, 1.3, DZ, 0.022], [k * 0.22, 1.5, DZ + 0.08, 0.016], [k * 0.3, 1.66, DZ + 0.22, 0.011]], 5, false);
    b.ellipsoid(m.organ, 0.03, 0.03, 0.03, k * 0.3, 1.68, DZ + 0.22, 5);
  }
  // entrance porch over the exit, gold arch, team keystone, dark birth canal behind the flap
  b.dome(m.chitin, 0.36, 0.76, 0.36, DX, 0.04, 0.6, 10);
  b.dome(m.dark, 0.27, 0.025, 0.31, DX, 0.34, 0.93, 8, HP);
  put(b, m.metal, new THREE.TorusGeometry(0.29, 0.035, 4, 10, Math.PI), DX, 0.04, 0.95, 0, 0, 0, 1, 2.15, 1);
  b.ellipsoid(m.team, 0.07, 0.06, 0.045, DX, 0.68, 0.95, 6);
  // mucus pathways from the pods to the door
  const path = [[0.45, 0.72], [0.2, 0.8], [-0.05, 0.85], [-0.24, 0.88]];
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    const [nx, nz] = path[Math.min(path.length - 1, i + 1)], [px, pz] = path[Math.max(0, i - 1)];
    b.ellipsoid(m.resin, 0.15, 0.014, 0.07, x, 0.062, z, 6, 0, Math.atan2(-(nz - pz), nx - px), 0);
  }
  root.add(b.build());

  // the hatching flap (rises when infantry emerge)
  const d = new PartBuilder();
  d.dome(m.chitinLight, 0.25, 0.05, 0.3, 0, -0.35, 0, 10, HP);
  d.box(m.team, 0.42, 0.05, 0.03, 0, -0.3, 0.045);
  d.box(m.chitin, 0.03, 0.5, 0.03, 0, -0.38, 0.04);
  for (const sx of [-1, 1]) d.ellipsoid(m.metal, 0.025, 0.025, 0.02, sx * 0.17, -0.45, 0.035, 5);
  const door = pivot('door', d, DX, 0.68, 0.97);
  door.userData.lift = 0.55;
  root.add(door);

  // cluster of free-standing incubation pods (front right), throbbing
  const p = new PartBuilder();
  for (const [x, y, z, r, h] of [[0, 0.02, 0, 0.16, 0.22], [0.2, -0.08, -0.16, 0.12, 0.16], [-0.12, -0.1, 0.22, 0.11, 0.15]]) {
    p.ellipsoid(m.membrane, r, h, r, x, y, z, 8);
    p.ellipsoid(m.flesh, r * 0.5, h * 0.55, r * 0.45, x, y - h * 0.1, z, 6, 0.3, 0, 0.4);
    p.ellipsoid(m.organ, r * 0.25, r * 0.25, r * 0.25, x, y + h * 0.3, z, 5);
    p.torus(m.metal, r * 0.75, 0.018, 3, 10, x, y - h * 0.72, z, HP, 0, 0);
    p.taper(m.resin, [x, y - h * 0.8, z], [x, -0.23, z], r * 0.4, r * 0.6, 5);
  }
  p.ellipsoid(m.resin, 0.3, 0.05, 0.3, 0.02, -0.26, 0.02, 8);
  root.add(pivot('pulsePods', p, 0.6, 0.3, 0.55));
  root.add(marker('smoke', 0, 1.42, DZ));
  return root;
}

/** Chitin Metamorphosis Pod (war factory) — 3×3, h 2.8, exit front. Vaulted cocoon hung between calcified ivory pillars. */
export function buildMetamorphosisPod(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const O8 = Math.PI / 8;
  // octagonal chitin floor
  b.cyl(m.chitinDark, 1.46, 1.52, 0.12, 8, 0, 0.06, 0, 0, O8, 0);
  ring(b, m.team, 1.51, 0.04, 0.05, 8, 0, 0, O8);
  ring(b, m.metal, 1.45, 0.028, 0.12, 8, 0, 0, O8);
  // glowing gestation channel to the gate, resin puddles
  b.box(m.organ, 0.12, 0.02, 2.1, 0, 0.125, 0.25);
  for (const sx of [-1, 1]) b.box(m.chitinLight, 0.05, 0.03, 2.1, sx * 0.1, 0.13, 0.25);
  for (const [x, z, r] of [[0.32, -0.2, 0.2], [-0.36, 0.1, 0.16], [0.18, 0.4, 0.12], [-0.2, -0.5, 0.18]]) b.ellipsoid(m.resin, r, 0.02, r * 0.8, x, 0.125, z, 8);
  b.box(m.metal, 1.3, 0.025, 0.05, 0, 0.13, 1.38);
  // four calcified ivory pillars with knuckled growth rings, team bands, gold finials
  const PX = 1.08, PZ = 1.0;
  const pil = [[0.19, 0.3], [0.16, 0.8], [0.14, 1.4], [0.13, 2.0], [0.17, 2.2], [0.2, 2.28], [0.0, 2.3]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * PX, z = sz * PZ;
    b.cyl(m.chitinDark, 0.2, 0.25, 0.22, 6, x, 0.23, z);
    lathe(b, m.bone, pil, 8, x, 0, z);
    for (const y of [0.6, 1.05, 1.5, 1.92]) ring(b, m.bone, profR(pil, y) + 0.01, 0.045, y, 8, x, z);
    ring(b, m.team, profR(pil, 0.82) + 0.01, 0.05, 0.82, 8, x, z);
    b.dome(m.chitinLight, 0.22, 0.16, 0.22, x, 2.28, z, 8);
    ring(b, m.metal, 0.22, 0.03, 2.29, 8, x, z);
    b.taper(m.metal, [x, 2.4, z], [x, 2.8, z], 0.06, 0.005, 6);
  }
  // the vault: ivory arches on all four sides and teal groin ribs crossing over the cocoon
  for (const sz of [-1, 1]) b.add(m.bone, new THREE.TorusGeometry(PX, 0.07, 5, 16, Math.PI), [0, 2.0, sz * PZ], [0, 0, 0], [1, 0.5, 1]);
  for (const sx of [-1, 1]) b.add(m.bone, new THREE.TorusGeometry(PZ, 0.065, 5, 14, Math.PI), [sx * PX, 2.0, 0], [0, HP, 0], [1, 0.54, 1]);
  const DR = Math.hypot(PX, PZ), DA = Math.atan2(PZ, PX);
  for (const s of [-1, 1]) b.add(m.chitin, new THREE.TorusGeometry(DR, 0.06, 5, 18, Math.PI), [0, 2.0, 0], [0, s * DA, 0], [1, 0.4, 1]);
  b.ellipsoid(m.metal, 0.16, 0.12, 0.16, 0, 2.58, 0, 8);
  b.dome(m.team, 0.12, 0.06, 0.12, 0, 2.66, 0, 8);
  // tendons from the vault boss down to the cocoon
  for (const [x, z] of [[0.3, 0.35], [-0.3, 0.35], [0.3, -0.45], [-0.3, -0.45]]) {
    b.taper(m.chitinDark, [x * 0.3, 2.55, z * 0.3], [x, 1.94, z - 0.05], 0.04, 0.025, 5);
  }
  // resin stalactites hardening on the arches
  for (const [x, z, l] of [[0.6, PZ, 0.26], [-0.45, PZ, 0.2], [0.5, -PZ, 0.22], [-PX, 0.45, 0.24], [PX, -0.3, 0.2]]) {
    const side = Math.abs(x) === PX; // hangs from a side arch (spans z) or a front/back arch (spans x)
    const span = side ? PZ : PX, u = side ? z : x;
    const top = 2.0 + (side ? 0.54 : 0.5) * Math.sqrt(Math.max(0, span * span - u * u)) - 0.04;
    b.taper(m.resin, [x, top, z], [x, top - l, z], 0.045, 0.01, 5);
    b.ellipsoid(m.resin, 0.03, 0.045, 0.03, x, top - l - 0.03, z, 5);
  }
  // chitin side screens with gold rivets and team bands
  for (const sx of [-1, 1]) {
    b.dome(m.chitin, 0.2, 1.05, 0.86, sx * PX, 0.12, 0, 10);
    put(b, m.team, new THREE.TorusGeometry(1, 0.045, 3, 16), sx * PX, 0.5, 0, HP, 0, 0, 0.195, 0.83, 1);
    for (let i = 0; i < 4; i++) b.ellipsoid(m.metal, 0.035, 0.035, 0.035, sx * (PX + 0.17), 0.72, -0.5 + i * 0.33, 5);
  }
  // back wall with a glowing brood comb
  b.dome(m.chitinDark, 0.95, 1.3, 0.3, 0, 0.12, -1.12, 10);
  comb(b, m.metal, m.organ, 0, 0.75, -0.87, 5, 3, 0.2, 0.08, 'z');
  // gate lintel in front of the shutter (the shutter slides up behind it)
  b.box(m.chitin, 2.0, 0.18, 0.16, 0, 1.22, 1.16);
  b.box(m.team, 1.2, 0.06, 0.03, 0, 1.22, 1.25);
  for (const x of [-0.8, -0.4, 0.4, 0.8]) b.ellipsoid(m.metal, 0.035, 0.035, 0.03, x, 1.22, 1.25, 5);
  apron(b, m, 0, 2.0, 1.1, 0.96, 1);
  root.add(b.build());

  // segmented chitin shutter (rises when a vehicle rolls out)
  const d = new PartBuilder();
  for (let i = 0; i < 4; i++) {
    const y = -0.48 + i * 0.25;
    d.box(i === 2 ? m.team : i % 2 ? m.chitinLight : m.chitin, 1.3, 0.27, 0.07, 0, y, 0, -0.12, 0, 0);
    for (const sx of [-1, 1]) d.ellipsoid(m.metal, 0.03, 0.03, 0.025, sx * 0.58, y, 0.045, 5);
  }
  d.box(m.chitinDark, 0.04, 0.98, 0.09, 0, -0.11, 0);
  root.add(pivot('door', d, 0, 0.68, 1.06));

  // the hanging cocoon: translucent silk over a gestating war-beetle, carapace bands, dripping resin
  const c = new PartBuilder();
  c.ellipsoid(m.membrane, 0.66, 0.62, 0.92, 0, 0, 0, 12);
  c.ellipsoid(m.chitinDark, 0.42, 0.3, 0.62, 0, -0.08, 0.02, 10);
  c.dome(m.chitin, 0.4, 0.2, 0.55, 0, 0.0, -0.02, 10);
  c.ellipsoid(m.organ, 0.16, 0.12, 0.2, 0, 0.18, 0.3, 6);
  for (const [z, mat] of [[-0.62, m.chitin], [-0.28, m.team], [0.08, m.chitin], [0.44, m.team], [0.72, m.chitin]]) {
    const k = Math.sqrt(1 - (z / 0.92) ** 2);
    put(c, mat, new THREE.TorusGeometry(1, 0.075, 4, 14), 0, 0, z, 0, 0, 0, 0.67 * k, 0.63 * k, 1);
  }
  for (const a of [0, 0.9, -0.9]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = -0.85 + i * (1.7 / 6), k = Math.sqrt(1 - t * t) * 1.03;
      pts.push([Math.sin(a) * 0.66 * k, Math.cos(a) * 0.62 * k, t * 0.92, 0.03]);
    }
    chain(c, m.chitinLight, pts, 4, false);
  }
  for (const [x, z, l] of [[0.2, 0.3, 0.32], [-0.25, -0.2, 0.4], [0.05, -0.55, 0.26], [-0.1, 0.55, 0.22]]) {
    const yb = -0.62 * Math.sqrt(Math.max(0.05, 1 - (x / 0.66) ** 2 - (z / 0.92) ** 2));
    c.taper(m.resin, [x, yb + 0.03, z], [x, yb - l, z], 0.05, 0.012, 5);
    c.ellipsoid(m.resin, 0.035, 0.05, 0.035, x, yb - l - 0.03, z, 5);
  }
  root.add(pivot('pulseCocoon', c, 0, 1.42, -0.05));
  return root;
}

/** Pheromone Roost (radar) — 2×2, h 3.6. Needle tower with wasp perches and sensory antennae arrays. */
export function buildPheromoneRoost(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(5);
  hexPlinth(b, m, 0.92, 0.14);
  b.cyl(m.chitin, 0.5, 0.62, 0.2, 6, 0, 0.24, 0, 0, Math.PI / 6, 0);
  ring(b, m.metal, 0.52, 0.025, 0.34, 6);
  studs(b, m.metal, 0.56, 0.25, 6, 0.03, Math.PI / 6);
  const prof = [[0.34, 0.12], [0.32, 0.5], [0.25, 1.1], [0.19, 1.7], [0.13, 2.3], [0.08, 2.9], [0.045, 3.3], [0.0, 3.62]];
  lathe(b, m.chitin, prof, 8);
  for (const y of [0.5, 1.1, 1.7, 2.3, 2.9]) ring(b, m.metal, profR(prof, y) + 0.01, 0.03, y, 8);
  for (const y of [0.8, 2.0]) ring(b, m.team, profR(prof, y) + 0.015, 0.045, y, 8);
  // chitinLight strakes running up the needle
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * HP, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinLight, prof.slice(0, 6).map(([r, y]) => [c * (r + 0.012), y, s * (r + 0.012), 0.022]), 4, false);
  }
  // tripod buttress roots
  for (const a of [Math.PI / 6, (5 * Math.PI) / 6, (3 * Math.PI) / 2]) {
    const c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinDark, [[c * 0.72, 0.12, s * 0.72, 0.07], [c * 0.6, 0.6, s * 0.6, 0.06], [c * 0.28, 1.02, s * 0.28, 0.05]], 6, false);
    b.ellipsoid(m.metal, 0.08, 0.08, 0.08, c * 0.6, 0.6, s * 0.6, 6);
    b.dome(m.chitinLight, 0.12, 0.06, 0.12, c * 0.72, 0.12, s * 0.72, 6);
  }
  // spiralling perches, two with roosting wasps
  [[1.15, 0.35, 0.74], [1.7, 2.45, 0.72], [2.25, 4.55, 0.66]].forEach(([y, a, R], i) => {
    const c = Math.cos(a), s = Math.sin(a), r0 = profR(prof, y);
    b.taper(m.chitin, [c * r0, y, s * r0], [c * R, y + 0.06, s * R], 0.055, 0.038, 5);
    b.taper(m.chitinDark, [c * r0 * 0.95, y - 0.38, s * r0 * 0.95], [c * R * 0.8, y + 0.04, s * R * 0.8], 0.036, 0.024, 4);
    b.cyl(m.chitinLight, 0.21, 0.16, 0.06, 6, c * R, y + 0.08, s * R);
    ring(b, m.metal, 0.21, 0.025, y + 0.11, 6, c * R, s * R);
    ring(b, m.team, 0.19, 0.028, y + 0.06, 6, c * R, s * R);
    if (i !== 1) wasp(b, m, c * R, y + 0.11, s * R, HP - a, 1.45);
    else for (let k = 0; k < 3; k++) {
      const aa = (k / 3) * TAU;
      chain(b, m.chitinDark, [[c * R + Math.cos(aa) * 0.08, y + 0.1, s * R + Math.sin(aa) * 0.08, 0.02], [c * R + Math.cos(aa) * 0.13, y + 0.34, s * R + Math.sin(aa) * 0.13, 0.011]], 4, false);
      b.ellipsoid(m.organ, 0.035, 0.035, 0.035, c * R + Math.cos(aa) * 0.13, y + 0.36, s * R + Math.sin(aa) * 0.13, 5);
    }
  });
  // sensory antennae arrays bristling up the tower
  for (const [y, n, len] of [[0.95, 5, 0.36], [1.45, 5, 0.33], [2.0, 6, 0.28], [2.55, 5, 0.24]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + y * 2.1, c = Math.cos(a), s = Math.sin(a), r0 = profR(prof, y);
      const p1 = [c * (r0 + len * 0.45), y + len * 0.45, s * (r0 + len * 0.45)];
      const p2 = [c * (r0 + len * 0.7), y + len * 1.1, s * (r0 + len * 0.7)];
      b.ellipsoid(m.metal, 0.03, 0.03, 0.03, c * r0, y, s * r0, 4);
      b.taper(m.chitinDark, [c * r0, y, s * r0], p1, 0.022, 0.015, 4);
      b.taper(m.chitinLight, p1, p2, 0.015, 0.005, 4);
      if (rng() < 0.7) b.ellipsoid(m.organ, 0.03, 0.03, 0.03, ...p2, 4);
    }
  }
  root.add(b.build());

  // rotating cluster of plumose (feathered) antennae near the tip
  const r = new PartBuilder();
  r.torus(m.metal, 0.11, 0.035, 4, 10, 0, 0, 0, HP, 0, 0);
  r.torus(m.team, 0.1, 0.03, 4, 10, 0, -0.07, 0, HP, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    const shaft = [[0.1, 0.0, 0.026], [0.32, 0.1, 0.022], [0.54, 0.28, 0.016], [0.68, 0.5, 0.01]].map(([dd, y, rr]) => [c * dd, y, s * dd, rr]);
    chain(r, m.chitinDark, shaft, 5, false);
    for (let k = 1; k <= 5; k++) {
      const t = (k / 6) * 3, i0 = Math.floor(t), f = t - i0;
      const A = shaft[i0], B = shaft[i0 + 1];
      const P = [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
      const bl = 0.11 * (1 - k * 0.08);
      for (const sd of [-1, 1]) r.taper(m.chitinLight, P, [P[0] - sd * s * bl, P[1] + 0.04, P[2] + sd * c * bl], 0.008, 0.002, 3);
    }
    r.ellipsoid(m.organ, 0.035, 0.035, 0.035, c * 0.68, 0.52, s * 0.68, 5);
  }
  root.add(pivot('radar', r, 0, 2.95, 0));
  return root;
}

/** Panoptic Compound Array (tech centre) — 2×2, h 3.8. Giant dragonfly compound eye on a segmented chitin pylon. */
export function buildPanopticArray(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  hexPlinth(b, m, 0.96, 0.16);
  // four jointed buttress legs gripping the pylon
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitin, [[c * 0.78, 0.16, s * 0.78, 0.065], [c * 0.74, 0.72, s * 0.74, 0.055], [c * 0.3, 1.2, s * 0.3, 0.045]], 6, false);
    b.ellipsoid(m.metal, 0.075, 0.075, 0.075, c * 0.74, 0.72, s * 0.74, 6);
    b.dome(m.chitinLight, 0.11, 0.07, 0.11, c * 0.78, 0.16, s * 0.78, 6);
    spikes(b, m.chitinLight, [c * 0.76, 0.4, s * 0.76], [c * 0.6, 0.85, s * 0.6], 2, 0.08, 0.018, [c, 0.4, s]);
  }
  // pylon = an upright dragonfly abdomen: six bulging segments, team / gold joint rings
  let y = 0.16;
  for (let i = 0; i < 6; i++) {
    const r = 0.3 - i * 0.024, h = 0.4;
    lathe(b, m.chitin, [[r * 0.82, y], [r, y + 0.1], [r * 0.96, y + 0.3], [r * 0.8, y + h]], 8);
    ring(b, i % 2 ? m.team : m.metal, r * 0.84, 0.035, y + h, 8);
    b.box(m.chitinLight, 0.03, h * 0.7, 0.03, 0, y + h * 0.5, r * 0.98);
    y += h;
  }
  // thorax and four resting dragonfly wings (vanes) with team pterostigmata
  b.ellipsoid(m.chitin, 0.26, 0.2, 0.28, 0, 2.62, 0, 10);
  ring(b, m.team, 0.255, 0.035, 2.6, 12);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * TAU, c = Math.cos(a), s = Math.sin(a);
    const P = vane(b, m.membrane, [c * 0.18, 2.55, s * 0.18], norm3([c, -0.16, s]), norm3([-s, 0.45, c]), 0.95, 0.4, m.chitinDark, 0.014);
    b.taper(m.chitinDark, P(0.05, -0.1), P(0.9, -0.06), 0.008, 0.003, 3);
    b.ellipsoid(m.team, 0.075, 0.03, 0.016, ...P(0.8, 0.09), 5, 0, -a, 0);
  }
  root.add(b.build());

  // the eye assembly (slowly sweeps the sky)
  const e = new PartBuilder();
  e.cyl(m.chitinDark, 0.16, 0.2, 0.16, 8, 0, 0, 0);
  e.torus(m.metal, 0.2, 0.035, 4, 12, 0, 0, 0, HP, 0, 0);
  e.dome(m.chitinDark, 0.52, 0.3, 0.52, 0, 0.36, 0, 12, Math.PI);
  e.torus(m.metal, 0.52, 0.04, 4, 16, 0, 0.36, 0, HP, 0, 0);
  e.torus(m.team, 0.46, 0.04, 4, 16, 0, 0.22, 0, HP, 0, 0);
  const TILT = 0.38;
  put(e, m.eye, new THREE.IcosahedronGeometry(0.5, 2), 0, 0.4, 0.02, TILT, 0, 0, 1, 0.8, 1);
  put(e, m.glass, new THREE.IcosahedronGeometry(0.53, 1), 0, 0.4, 0.02, TILT, 0, 0, 1, 0.8, 1);
  // iridescent ommatidia glinting across the upper eye
  const eyeM = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.4, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, 0, 0)), new THREE.Vector3(1, 1, 1));
  const eyeN = new THREE.Matrix3().getNormalMatrix(eyeM);
  for (const [th, n, ph] of [[0.55, 7, 0], [0.95, 10, 0.3], [1.3, 12, 0.1]]) {
    for (let i = 0; i < n; i++) {
      const phi = ph + (i / n) * TAU;
      const dir = new THREE.Vector3(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi));
      const p = new THREE.Vector3(dir.x * 0.505, dir.y * 0.405, dir.z * 0.505).applyMatrix4(eyeM);
      const nn = new THREE.Vector3(dir.x / 0.5, dir.y / 0.4, dir.z / 0.5).applyMatrix3(eyeN).normalize();
      e.taper(i % 3 ? m.crystal : m.chitinLight, p.toArray(), p.clone().addScaledVector(nn, 0.014).toArray(), 0.038, 0.034, 6);
    }
  }
  const ux = Math.cos(TILT), uz = Math.sin(TILT);
  put(e, m.crystal, half(10), 0, 0.4 + 0.4 * ux, 0.02 + 0.4 * uz, TILT, 0, 0, 0.18, 0.05, 0.18);
  put(e, m.photon, new THREE.TorusGeometry(0.21, 0.018, 3, 14), 0, 0.4 + 0.37 * ux, 0.02 + 0.37 * uz, TILT - HP, 0, 0);
  for (const sx of [-1, 1]) {
    e.ellipsoid(m.metal, 0.07, 0.09, 0.09, sx * 0.53, 0.4, 0, 6);
    e.taper(m.chitinLight, [sx * 0.42, 0.18, 0], [sx * 0.53, 0.38, 0], 0.04, 0.03, 5);
    chain(e, m.chitinDark, [[sx * 0.15, 0.4, -0.45, 0.018], [sx * 0.22, 0.85, -0.5, 0.012], [sx * 0.26, 1.08, -0.38, 0.008]], 4, false);
    e.ellipsoid(m.organ, 0.028, 0.028, 0.028, sx * 0.26, 1.09, -0.38, 5);
  }
  root.add(pivot('radar', e, 0, 2.68, 0));
  return root;
}

/** Enzymatic Catalyst Synthesizer (ore purifier) — 2×2, h 2.6. Tall crystalline glands pulsing with neon catalytic bile. */
export function buildEnzymaticSynth(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(21);
  hexPlinth(b, m, 0.96, 0.14);
  // bile basin
  lathe(b, m.chitin, [[0.86, 0.13], [0.9, 0.3], [0.86, 0.37], [0.78, 0.33], [0.74, 0.24]], 12);
  b.cyl(m.acid, 0.76, 0.76, 0.04, 12, 0, 0.25, 0);
  ring(b, m.metal, 0.86, 0.025, 0.37, 12);
  ring(b, m.team, 0.9, 0.04, 0.22, 12);
  for (let i = 0; i < 7; i++) {
    const a = rng() * TAU, dd = 0.5 + rng() * 0.2;
    b.octa(m.crystal, 0.05 + rng() * 0.04, Math.cos(a) * dd, 0.29, Math.sin(a) * dd, 1, 1.8, 1, rng() * 0.6, a, rng() * 0.5);
  }
  // catalyst node between the glands, fed by gold pipes
  const glands = [[0, -0.3, 2.05, 'pulseGlandA'], [-0.38, 0.24, 1.5, 'pulseGlandB'], [0.38, 0.24, 1.3, 'pulseGlandC']];
  const NZ = 0.06;
  b.taper(m.metal, [0, 0.26, NZ], [0, 0.88, NZ], 0.05, 0.04, 6);
  b.ellipsoid(m.chitinLight, 0.13, 0.1, 0.13, 0, 0.95, NZ, 8);
  ring(b, m.organ, 0.13, 0.025, 0.95, 10, 0, NZ);
  for (const [x, z] of glands) {
    const dx = x, dz = z - NZ, dl = Math.hypot(dx, dz);
    b.taper(m.metal, [dx * 0.25, 0.95, NZ + dz * 0.25], [x - (dx / dl) * 0.2, 0.9, z - (dz / dl) * 0.2], 0.035, 0.03, 5);
  }
  // gold sockets, team collars and chitin clamps under every gland
  for (const [x, z] of glands) {
    b.cyl(m.metal, 0.18, 0.22, 0.14, 6, x, 0.32, z, 0, Math.PI / 6, 0);
    ring(b, m.team, 0.215, 0.035, 0.3, 6, x, z);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + 0.5;
      b.taper(m.chitinDark, [x + Math.cos(a) * 0.22, 0.3, z + Math.sin(a) * 0.22], [x + Math.cos(a) * 0.2, 0.62, z + Math.sin(a) * 0.2], 0.04, 0.012, 4);
    }
  }
  root.add(b.build());

  // the glands: faceted amber vessels with glowing bile cores, gold hoops and crystal crowns
  for (const [x, z, h, name] of glands) {
    const g = new PartBuilder();
    const H = h / 2;
    const gp = [[0.13, -H], [0.21, -H + 0.18 * h], [0.23, -H + 0.45 * h], [0.17, -H + 0.75 * h], [0.08, H - 0.05], [0.0, H]];
    lathe(g, m.resin, gp, 6);
    g.ellipsoid(m.acid, 0.13, H * 0.78, 0.13, 0, 0, 0, 6);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a);
      chain(g, m.organ, [[c * 0.15, -H + 0.1, s * 0.15, 0.012], [c * 0.22, -H + 0.45 * h, s * 0.22, 0.014], [c * 0.1, H - 0.08, s * 0.1, 0.01]], 3, false);
    }
    for (const t of [0.3, 0.62]) ring(g, m.metal, profR(gp, -H + t * h) + 0.012, 0.022, -H + t * h, 6, 0, 0, Math.PI / 6);
    g.octa(m.crystal, 0.08, 0, H + 0.08, 0, 1, 2.2, 1);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + 1.0, c = Math.cos(a), s = Math.sin(a);
      g.octa(m.crystal, 0.05, c * 0.08, H - 0.02, s * 0.08, 1, 2, 1, s * 0.5, 0, -c * 0.5);
    }
    root.add(pivot(name, g, x, 0.36 + H, z));
  }
  return root;
}

/** Mutualist Cleaning Hollow (service depot) — 3×3, h 0.9, walkable. Shallow bowl tended by cleaner mites and repair larvae. */
export function buildCleaningHollow(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // shallow bowl: berm outside → rim → floor (the centre stays ≤ 0.15 so parked vehicles sit inside)
  lathe(b, m.mud, [[1.52, 0.0], [1.48, 0.17], [1.41, 0.25], [1.33, 0.2], [1.24, 0.09], [1.0, 0.035], [0.0, 0.03]], 18);
  // hex-comb service floor with team border and gold inner ring
  comb(b, m.chitinDark, m.resin, 0, 0.045, 0, 5, 5, 0.26, 0.03, 'y');
  ring(b, m.team, 0.86, 0.03, 0.065, 6);
  ring(b, m.metal, 0.96, 0.022, 0.05, 6);
  // team chevrons at the four drive-in mouths, pointing into the hollow
  for (let k = 0; k < 4; k++) {
    const a = k * HP;
    chevron(b, m.team, Math.cos(a) * 1.0, 0.075, Math.sin(a) * 1.0, a + Math.PI, 0.26, 0.07);
  }
  // chitin lips on the four diagonal sectors
  for (let k = 0; k < 4; k++) {
    const c0 = Math.PI / 4 + k * HP;
    ring(b, m.chitinLight, 1.41, 0.07, 0.27, 8, 0, 0, c0 - 0.5, 1.0);
    for (const da of [-0.32, 0, 0.32]) {
      const a = c0 + da;
      b.dome(m.chitin, 0.16, 0.2, 0.24, Math.cos(a) * 1.46, 0.08, Math.sin(a) * 1.46, 8, 0, -a, 0);
    }
  }
  // corner posts with organ lamps and gold spray arms dripping fresh resin
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 1.24, z = sz * 1.24;
    b.cyl(m.chitinDark, 0.11, 0.14, 0.12, 6, x, 0.06, z);
    b.taper(m.bone, [x, 0.1, z], [x, 0.76, z], 0.075, 0.05, 6);
    ring(b, m.team, 0.07, 0.03, 0.42, 8, x, z);
    ring(b, m.metal, 0.058, 0.02, 0.62, 8, x, z);
    b.cone(m.metal, 0.08, 0.1, 6, x, 0.8, z);
    b.ellipsoid(m.organ, 0.045, 0.045, 0.045, x, 0.88, z, 6);
    const ix = sx * 0.98, iz = sz * 0.98;
    chain(b, m.metal, [[x, 0.7, z, 0.025], [x * 0.9, 0.75, z * 0.9, 0.02], [ix, 0.6, iz, 0.016]], 4, false);
    b.cone(m.metal, 0.03, 0.06, 5, ix, 0.57, iz, Math.PI, 0, 0);
    b.taper(m.resin, [ix, 0.54, iz], [ix, 0.4, iz], 0.018, 0.008, 4);
  }
  // cleaner mites on the lips and repair larvae on the inner slope
  for (const a of [0.55, 2.3, 3.75, 5.3]) {
    const x = Math.cos(a) * 1.4, z = Math.sin(a) * 1.4;
    mite(b, m, x, 0.25, z, Math.atan2(-Math.cos(a), -Math.sin(a)), 1.1);
  }
  for (const a of [1.2, 4.3]) {
    const x = Math.cos(a) * 1.3, z = Math.sin(a) * 1.3;
    grub(b, m, x, 0.14, z, Math.atan2(-Math.sin(a), Math.cos(a)), 1.2);
  }
  root.add(b.build());
  return root;
}

/** Tachyon Mantis Reliquary (chronosphere) — 3×3, h 3.4. Articulated cage around a captive Quantum Mantis in spatial distortion. */
export function buildTachyonReliquary(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const O8 = Math.PI / 8;
  b.cyl(m.chitinDark, 1.44, 1.5, 0.16, 8, 0, 0.08, 0, 0, O8, 0);
  ring(b, m.team, 1.5, 0.045, 0.07, 8, 0, 0, O8);
  ring(b, m.metal, 1.42, 0.03, 0.16, 8, 0, 0, O8);
  b.cyl(m.chitin, 1.0, 1.08, 0.14, 8, 0, 0.23, 0, 0, O8, 0);
  ring(b, m.metal, 1.0, 0.03, 0.3, 8, 0, 0, O8);
  ring(b, m.chrono, 0.74, 0.03, 0.31, 24);
  ring(b, m.chrono, 0.42, 0.025, 0.31, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    b.box(m.metal, 0.3, 0.025, 0.05, Math.cos(a) * 0.58, 0.31, Math.sin(a) * 0.58, 0, -a, 0);
  }
  // six hyper-articulated mantis limbs forming the cage
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    const P = (r, y) => [c * r, y, s * r];
    const p0 = P(1.22, 0.16), k1 = P(1.36, 1.05), k2 = P(1.14, 2.1), k3 = P(0.56, 2.86), tip = P(0.2, 3.06);
    b.dome(m.chitinDark, 0.17, 0.1, 0.17, ...p0, 6);
    b.taper(m.chitin, p0, k1, 0.09, 0.075, 6);
    b.taper(m.chitinLight, k1, k2, 0.07, 0.055, 6);
    b.taper(m.chitin, k2, k3, 0.055, 0.045, 6);
    b.taper(m.chitinDark, k3, tip, 0.042, 0.03, 5);
    for (const [p, r] of [[k1, 0.1], [k2, 0.085], [k3, 0.065]]) b.ellipsoid(m.metal, r, r, r, ...p, 6);
    spikes(b, m.chitinLight, P(1.3, 1.3), P(1.18, 1.9), 3, 0.11, 0.02, [-c, 0.25, -s]);
    const a2 = a + TAU / 6;
    b.strut(m.metal, k1, [Math.cos(a2) * 1.14, 2.1, Math.sin(a2) * 1.14], 0.018, 4);
  }
  ring(b, m.team, 1.36, 0.045, 1.05, 24);
  ring(b, m.metal, 1.14, 0.035, 2.1, 24);
  ring(b, m.chitinLight, 0.56, 0.03, 2.86, 16);
  // crown with a chrono spike
  b.dome(m.chitin, 0.3, 0.16, 0.3, 0, 3.0, 0, 10);
  ring(b, m.metal, 0.28, 0.035, 3.02, 12);
  b.taper(m.chrono, [0, 3.1, 0], [0, 3.42, 0], 0.06, 0.006, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.taper(m.metal, [Math.cos(a) * 0.24, 3.06, Math.sin(a) * 0.24], [Math.cos(a) * 0.36, 3.18, Math.sin(a) * 0.36], 0.03, 0.004, 4);
  }
  root.add(b.build());

  // core: the captive Quantum Mantis inside gyroscopic chrono rings
  const k = new PartBuilder();
  k.taper(m.chitinLight, [0, -0.06, -0.02], [0, 0.4, 0.07], 0.06, 0.042, 6);
  k.ellipsoid(m.chitin, 0.085, 0.11, 0.095, 0, -0.1, -0.03, 8);
  k.ellipsoid(m.chitinLight, 0.12, 0.065, 0.065, 0, 0.47, 0.1, 8);
  for (const sx of [-1, 1]) {
    k.ellipsoid(m.chrono, 0.04, 0.045, 0.04, sx * 0.1, 0.49, 0.11, 6);
    chain(k, m.chitinDark, [[sx * 0.03, 0.52, 0.13, 0.008], [sx * 0.12, 0.7, 0.2, 0.006], [sx * 0.22, 0.78, 0.12, 0.004]], 4, false);
    // folded raptorial forelegs with spines
    const sh = [sx * 0.055, 0.3, 0.07], kn = [sx * 0.11, 0.17, 0.2], fe = [sx * 0.12, 0.42, 0.3], ti = [sx * 0.09, 0.2, 0.25];
    k.taper(m.chitin, sh, kn, 0.03, 0.026, 5);
    k.taper(m.chitinLight, kn, fe, 0.034, 0.024, 5);
    k.taper(m.chitin, fe, ti, 0.02, 0.012, 5);
    spikes(k, m.chitinDark, kn, fe, 3, 0.05, 0.01, [-sx * 0.3, -0.2, 1]);
    // mid and hind legs dangling
    for (const [w, sp] of [[0.0, 0.3], [-0.08, 0.36]]) {
      const hip = [sx * 0.07, -0.1, w], knee = [sx * sp, -0.02, w + 0.05], foot = [sx * (sp + 0.06), -0.42, w - 0.05];
      k.taper(m.chitinDark, hip, knee, 0.018, 0.014, 4);
      k.taper(m.chitinDark, knee, foot, 0.014, 0.006, 4);
    }
    // wings spread in threat display, chrono eyespots on the hind pair
    for (const [beta, L, W] of [[0.95, 0.5, 0.2], [0.35, 0.46, 0.24]]) {
      const P = vane(k, m.membrane, [sx * 0.04, 0.05, -0.09], norm3([sx * Math.cos(beta), Math.sin(beta), -0.15]), norm3([-sx * Math.sin(beta), Math.cos(beta), 0]), L, W, m.chitinDark, 0.008);
      if (beta < 0.5) k.ellipsoid(m.chrono, 0.04, 0.04, 0.012, ...P(0.62, -0.02), 6);
    }
  }
  const AX = 0.25, au = [0, Math.cos(AX), Math.sin(AX)];
  put(k, m.chitinLight, sph(8), 0, -0.44, -0.1, AX, 0, 0, 0.12, 0.36, 0.13);
  put(k, m.chrono, sph(6), 0, -0.44 + Math.sin(AX) * 0.125, -0.1 - Math.cos(AX) * 0.125, AX, 0, 0, 0.026, 0.3, 0.02);
  for (const t of [0.12, -0.12]) {
    const f = Math.sqrt(1 - (t / 0.36) ** 2) * 1.03;
    put(k, m.team, new THREE.TorusGeometry(1, 0.1, 3, 10), 0, -0.44 + au[1] * t, -0.1 + au[2] * t, AX - HP, 0, 0, 0.12 * f, 0.13 * f, 0.3);
  }
  const rg = new PartBuilder();
  for (const [r, pitch, yaw] of [[0.66, HP, 0], [0.74, 0.55, 0.4], [0.82, -0.6, 1.9]]) {
    put(rg, m.chrono, new THREE.TorusGeometry(r, 0.022, 4, 28), 0, 0, 0, pitch, yaw, 0);
  }
  const core = pivot('core', rg, 0, 1.6, 0);
  const mantis = new THREE.Group(); // unnamed: baked into the core bone, just scaled up
  mantis.add(k.build());
  mantis.scale.setScalar(1.3);
  mantis.position.y = 0.05;
  core.add(mantis);
  // shards of torn space flickering round the mantis (fast pulse)
  const gf = new PartBuilder();
  const rng = mulberry32(41);
  for (let i = 0; i < 12; i++) {
    const th = Math.acos(1 - (2 * (i + 0.5)) / 12), ph = i * 2.4, r = 0.84 + rng() * 0.1;
    gf.octa(m.chrono, 0.035 + rng() * 0.03, Math.sin(th) * Math.cos(ph) * r, Math.cos(th) * r * 0.9, Math.sin(th) * Math.sin(ph) * r, 1, 1.8, 1, rng() * 3, rng() * 3, 0);
  }
  core.add(pivot('glowField', gf));
  root.add(core);
  return root;
}

/** Stratospheric Swarm Conduit (weather control) — 3×3, h 4.2. Towering coil of interlocking cicada wings around a resonant mast. */
export function buildSwarmConduit(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  hexPlinth(b, m, 1.5, 0.18);
  b.cyl(m.chitin, 0.86, 0.95, 0.16, 6, 0, 0.26, 0, 0, Math.PI / 6, 0);
  ring(b, m.metal, 0.88, 0.03, 0.34, 6);
  studs(b, m.metal, 1.22, 0.19, 12, 0.035, 0.26);
  // three ribbed cicada tymbal drums round the base
  for (const a of [Math.PI / 6, (5 * Math.PI) / 6, (3 * Math.PI) / 2]) {
    const c = Math.cos(a), s = Math.sin(a), yaw = HP - a;
    const cx = c * 1.02, cz = s * 1.02;
    put(b, m.chitin, sph(10), cx, 0.44, cz, 0, yaw, 0, 0.32, 0.3, 0.22);
    for (let j = -2; j <= 2; j++) {
      const u = j * 0.085, f = Math.sqrt(1 - (u / 0.32) ** 2);
      const p = yawPt(cx, 0.44, cz, yaw, u, 0, 0.22 * f * 0.97);
      const hg = 0.3 * f * 0.72;
      b.taper(m.bone, [p[0], 0.44 - hg, p[2]], [p[0], 0.44 + hg, p[2]], 0.03, 0.03, 4);
    }
    put(b, m.metal, new THREE.TorusGeometry(0.27, 0.03, 3, 14), ...yawPt(cx, 0.44, cz, yaw, 0, 0, 0.1), 0, yaw, 0, 1, 0.95, 1);
    put(b, m.team, half(8), cx, 0.66, cz, 0, yaw, 0, 0.16, 0.09, 0.12);
  }
  // buttress roots between the drums (kept low, under the wing coil)
  for (const a of [HP, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
    const c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinDark, [[c * 1.2, 0.18, s * 1.2, 0.08], [c * 0.8, 0.5, s * 0.8, 0.065], [c * 0.3, 0.72, s * 0.3, 0.05]], 6, false);
    b.ellipsoid(m.metal, 0.085, 0.085, 0.085, c * 0.8, 0.5, s * 0.8, 6);
  }
  // resonant mast
  const prof = [[0.3, 0.3], [0.27, 0.9], [0.21, 1.8], [0.16, 2.7], [0.12, 3.5], [0.09, 3.9], [0.0, 3.98]];
  lathe(b, m.chitin, prof, 10);
  for (const y of [0.9, 1.8, 2.7, 3.5]) ring(b, m.metal, profR(prof, y) + 0.01, 0.03, y, 10, 0, 0, Math.PI / 10);
  for (const y of [1.35, 3.1]) ring(b, m.team, profR(prof, y) + 0.015, 0.045, y, 10, 0, 0, Math.PI / 10);
  ring(b, m.metal, 0.12, 0.035, 3.9, 10);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.metal, [[c * 0.09, 3.88, s * 0.09, 0.025], [c * 0.2, 4.0, s * 0.2, 0.018], [c * 0.16, 4.14, s * 0.16, 0.01]], 4, false);
  }
  root.add(b.build());

  // crackling storm seed at the top
  const orb = new PartBuilder();
  orb.ellipsoid(m.spark, 0.1, 0.1, 0.1, 0, 0, 0, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU, dir = norm3([Math.cos(a), 0.6 + (i % 2) * 0.5, Math.sin(a)]);
    orb.taper(m.spark, [0, 0, 0], [dir[0] * 0.2, dir[1] * 0.2, dir[2] * 0.2], 0.022, 0.003, 3);
  }
  root.add(pivot('glowOrb', orb, 0, 4.06, 0));

  // core: the helical coil of interlocking cicada wings (spins up while charging)
  const k = new PartBuilder();
  const N = 22, TURNS = 2.2, H = 2.75, Y0 = 0.95;
  const roots = [], tips = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), a = t * TURNS * TAU, y = t * H;
    const c = Math.cos(a), s = Math.sin(a);
    const rIn = profR(prof, Y0 + y) + 0.05, rOut = 0.82 + 0.42 * t;
    const o = [c * rIn, y, s * rIn];
    const P = vane(k, m.membrane, o, norm3([c, 0.12, s]), norm3([-s, -0.45, c]), rOut - rIn, 0.46, m.chitinDark, 0.014);
    k.ellipsoid(m.team, 0.045, 0.016, 0.03, ...P(0.84, 0.07), 5, 0, -a, 0);
    k.ellipsoid(m.metal, 0.04, 0.04, 0.04, ...o, 5);
    roots.push(o);
    tips.push(P(1, 0));
  }
  for (let i = 1; i < N; i++) {
    k.strut(m.chitinLight, roots[i - 1], roots[i], 0.03, 5);
    k.strut(m.metal, tips[i - 1], tips[i], 0.014, 4);
  }
  root.add(pivot('core', k, 0, Y0, 0));
  return root;
}

export const MODELS = {
  maternalSpire: buildMaternalSpire,
  fireflyHive: buildFireflyHive,
  digestiveMound: buildDigestiveMound,
  broodHatchery: buildBroodHatchery,
  metamorphosisPod: buildMetamorphosisPod,
  pheromoneRoost: buildPheromoneRoost,
  panopticArray: buildPanopticArray,
  enzymaticSynth: buildEnzymaticSynth,
  cleaningHollow: buildCleaningHollow,
  tachyonReliquary: buildTachyonReliquary,
  swarmConduit: buildSwarmConduit,
};

void eyes; void ribs; void plates; void antennae;
