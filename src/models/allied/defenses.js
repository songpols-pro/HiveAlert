// ALLIED defenses — Hymenoptera & Elytra Bio-Tech (calcified domes, beetle-abdomen pods, golden jewel-beetle mirrors).
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { mulberry32 } from '../../core/util.js';
import { PartBuilder, pivot, marker, chain, spikes, sacs, stilts } from '../insectKit.js';

const F = 'allied';

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

/** Surface of revolution from [[radius, y], …]. Visible side is right of travel (outside up, inward over the top). */
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
/** Horizontal ring (torus lying flat); `spin` rotates its polygon corners about Y. */
function ring(b, mat, r, tube, y, seg = 16, x = 0, z = 0, spin = 0) {
  return b.torus(mat, r, tube, 3, seg, x, y, z, HP, 0, spin);
}
/** Point in a yawed local frame (u right, v up, w forward). */
function yawPt(x, y, z, yaw, u, v, w) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x + u * c + w * s, y + v, z - u * s + w * c];
}

// ------------------------------------------------------------------ defenses

/** Hardened Stink-Chamber (pillbox) — 1×1, h 0.8. Calcified dome bristling with sensory bristles and needle embrasures. */
export function buildStinkChamber(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const rng = mulberry32(17);
  const S10 = Math.PI / 10;
  b.cyl(m.chitinDark, 0.45, 0.49, 0.08, 10, 0, 0.04, 0);
  ring(b, m.team, 0.475, 0.032, 0.045, 10, 0, 0, S10);
  // calcified dome with a chitin girdle
  const prof = [[0.44, 0.07], [0.43, 0.2], [0.38, 0.34], [0.29, 0.45], [0.15, 0.53], [0.0, 0.56]];
  lathe(b, m.bone, prof, 10);
  ring(b, m.metal, 0.44, 0.024, 0.09, 10, 0, 0, S10);
  ring(b, m.chitinLight, profR(prof, 0.4) + 0.012, 0.026, 0.4, 10, 0, 0, S10);
  ring(b, m.team, profR(prof, 0.47) + 0.01, 0.026, 0.47, 10, 0, 0, S10);
  const EMB = [HP, HP + TAU / 3, HP - TAU / 3];
  // teal carapace scutes between the embrasures
  for (const e of EMB) {
    for (const da of [-0.22, 0.22]) {
      const a = e + Math.PI / 3 + da, c = Math.cos(a), s = Math.sin(a), r = profR(prof, 0.24);
      put(b, m.chitin, half(8), c * (r - 0.012), 0.24, s * (r - 0.012), HP - 0.38, HP - a, 0, 0.065, 0.035, 0.15);
      b.ellipsoid(m.metal, 0.02, 0.02, 0.02, c * (profR(prof, 0.37) + 0.012), 0.37, s * (profR(prof, 0.37) + 0.012), 4);
    }
  }
  // needle-spitting embrasures: dark slit, chitin brow, gold jambs, injector needle
  const er = profR(prof, 0.27);
  for (const a of EMB) {
    const c = Math.cos(a), s = Math.sin(a), yaw = HP - a;
    put(b, m.dark, new THREE.BoxGeometry(0.2, 0.075, 0.1), c * er, 0.27, s * er, 0, yaw);
    put(b, m.chitinLight, new THREE.BoxGeometry(0.22, 0.03, 0.07), c * (er + 0.02), 0.322, s * (er + 0.02), 0.3, yaw);
    for (const k of [-1, 1]) b.ellipsoid(m.metal, 0.024, 0.045, 0.024, ...yawPt(c * er, 0.27, s * er, yaw, k * 0.11, 0, 0.035), 5);
    b.taper(m.metal, [c * (er - 0.02), 0.27, s * (er - 0.02)], [c * (er + 0.1), 0.27, s * (er + 0.1)], 0.024, 0.006, 5);
    b.ellipsoid(m.organ, 0.018, 0.018, 0.018, ...yawPt(c * er, 0.27, s * er, yaw, 0.055, 0, 0.04), 4);
  }
  // sensory bristles (kept off the firing slits)
  for (let i = 0; i < 34; i++) {
    const a = rng() * TAU, y = 0.12 + rng() * 0.4;
    const de = Math.min(...EMB.map((e) => Math.abs(Math.atan2(Math.sin(a - e), Math.cos(a - e)))));
    if (de < 0.38 && y < 0.38) continue;
    const r = profR(prof, y), c = Math.cos(a), s = Math.sin(a);
    const dir = norm3([c, 0.3 + (y - 0.12) * 2.5, s]), L = 0.09 + rng() * 0.06;
    b.taper(m.chitinDark, [c * r, y, s * r], [c * r + dir[0] * L, y + dir[1] * L, s * r + dir[2] * L], 0.011, 0.002, 3);
  }
  // sensor cupola with an organ lamp and twin antennae
  b.dome(m.chitin, 0.13, 0.08, 0.13, 0, 0.54, 0, 8);
  ring(b, m.metal, 0.13, 0.022, 0.55, 8);
  b.ellipsoid(m.organ, 0.055, 0.05, 0.055, 0, 0.64, 0, 6);
  for (const k of [-1, 1]) {
    chain(b, m.chitinDark, [[k * 0.05, 0.6, -0.02, 0.012], [k * 0.1, 0.72, 0.02, 0.008], [k * 0.14, 0.8, 0.08, 0.005]], 4, false);
  }
  root.add(b.build());
  root.add(marker('muzzle', 0, 0.27, er + 0.11));
  return root;
}

/** Sky-Piercer Bombardier Sentry (AA) — 1×1, h 1.6. Four elongated beetle-abdomen pods on a swivelling carapace turret. */
export function buildSkyPiercer(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  b.cyl(m.chitinDark, 0.4, 0.46, 0.12, 6, 0, 0.06, 0, 0, Math.PI / 6, 0);
  ring(b, m.team, 0.455, 0.032, 0.055, 6);
  ring(b, m.metal, 0.4, 0.022, 0.12, 6);
  // clawed tripod feet and the column
  for (let i = 0; i < 3; i++) {
    const a = HP + Math.PI / 3 + (i / 3) * TAU, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitin, [[c * 0.18, 0.3, s * 0.18, 0.042], [c * 0.36, 0.22, s * 0.36, 0.032], [c * 0.44, 0.12, s * 0.44, 0.02]], 5, false);
    b.ellipsoid(m.metal, 0.04, 0.04, 0.04, c * 0.36, 0.22, s * 0.36, 5);
  }
  const col = [[0.21, 0.11], [0.17, 0.4], [0.13, 0.62], [0.16, 0.72], [0.0, 0.74]];
  lathe(b, m.chitin, col, 8);
  ring(b, m.team, profR(col, 0.4) + 0.012, 0.035, 0.4, 8);
  ring(b, m.metal, 0.17, 0.03, 0.71, 12);
  root.add(b.build());

  // turret: carapace saddle cradling a 2×2 cluster of pods aimed up-forward
  const t = new PartBuilder();
  t.ellipsoid(m.chitinDark, 0.22, 0.07, 0.24, 0, 0, 0, 10);
  t.dome(m.chitin, 0.27, 0.13, 0.3, 0, 0.02, -0.04, 10);
  t.dome(m.team, 0.07, 0.135, 0.305, 0, 0.02, -0.04, 8);
  for (const k of [-1, 1]) t.ellipsoid(m.eye, 0.04, 0.035, 0.03, k * 0.1, 0.08, 0.22, 6);
  const E = 0.87;
  const d = [0, Math.sin(E), Math.cos(E)], u = [0, Math.cos(E), -Math.sin(E)];
  const c0 = [0, 0.27, 0.02];
  // slim gold-riveted cradle arms on each side of the pod cluster
  for (const sx of [-1, 1]) {
    t.box(m.chitin, 0.03, 0.16, 0.26, sx * 0.205, c0[1] - 0.02, c0[2] - 0.02, -E, 0, 0);
    t.taper(m.chitinLight, [sx * 0.2, 0.02, -0.06], [sx * 0.205, c0[1] - 0.02, c0[2] - 0.02], 0.035, 0.025, 5);
    for (const k of [-0.08, 0.08]) t.ellipsoid(m.metal, 0.022, 0.022, 0.022, sx * 0.224, c0[1] - 0.02 + d[1] * k, c0[2] - 0.02 + d[2] * k, 4);
  }
  for (const px of [-0.1, 0.1]) for (const pu of [-0.095, 0.095]) {
    const pc = [px, c0[1] + u[1] * pu, c0[2] + u[2] * pu];
    const at = (k) => [pc[0], pc[1] + d[1] * k, pc[2] + d[2] * k];
    put(t, m.chitin, sph(8), ...pc, -E, 0, 0, 0.085, 0.085, 0.36);
    put(t, m.team, new THREE.TorusGeometry(0.081, 0.018, 3, 10), ...at(-0.08), -E, 0, 0);
    put(t, m.chitinLight, new THREE.TorusGeometry(0.078, 0.014, 3, 10), ...at(0.1), -E, 0, 0);
    put(t, m.metal, new THREE.TorusGeometry(0.058, 0.014, 3, 10), ...at(0.25), -E, 0, 0);
    put(t, m.organ, new THREE.ConeGeometry(0.045, 0.1, 6), ...at(0.37), HP - E, 0, 0);
  }
  for (const k of [-1, 1]) {
    chain(t, m.chitinDark, [[k * 0.06, 0.12, -0.16, 0.014], [k * 0.12, 0.45, -0.24, 0.01], [k * 0.15, 0.74, -0.14, 0.006]], 4, false);
    t.ellipsoid(m.organ, 0.02, 0.02, 0.02, k * 0.15, 0.75, -0.14, 4);
  }
  const turret = pivot('turret', t, 0, 0.78, 0);
  turret.add(marker('muzzle', 0, c0[1] + d[1] * 0.44, c0[2] + d[2] * 0.44));
  root.add(turret);
  return root;
}

/** Jewel Beetle Refraction Obelisk (prism tower) — 1×1, h 3.0. Monolith of layered golden Chrysina elytra mirrors, focusing gem on top. */
export function buildJewelObelisk(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const Q = Math.PI / 4;
  // stepped square plinth, beetle-tarsus claws at the corners
  b.cyl(m.chitinDark, 0.6, 0.64, 0.14, 4, 0, 0.07, 0, 0, Q, 0);
  ring(b, m.team, 0.64, 0.035, 0.065, 4, 0, 0, Q);
  ring(b, m.metal, 0.59, 0.024, 0.14, 4, 0, 0, Q);
  b.cyl(m.chitin, 0.42, 0.48, 0.16, 4, 0, 0.22, 0, 0, Q, 0);
  ring(b, m.metal, 0.42, 0.022, 0.3, 4, 0, 0, Q);
  for (let i = 0; i < 4; i++) {
    const a = Q + i * HP, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.chitinLight, [[c * 0.42, 0.28, s * 0.42, 0.04], [c * 0.58, 0.22, s * 0.58, 0.03], [c * 0.64, 0.1, s * 0.64, 0.018]], 5, false);
  }
  // tapering square shaft with glowing photon arrises
  const Y0 = 0.3, Y1 = 2.46, R0 = 0.3, R1 = 0.12;
  b.cyl(m.chitinDark, R1, R0, Y1 - Y0, 4, 0, (Y0 + Y1) / 2, 0, 0, Q, 0);
  const rAt = (y) => R0 + ((R1 - R0) * (y - Y0)) / (Y1 - Y0);
  const lean = Math.atan2((R0 - R1) * Math.SQRT1_2, Y1 - Y0);
  for (let i = 0; i < 4; i++) {
    const a = Q + i * HP, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.photon, [c * R0, Y0, s * R0], [c * R1, Y1, s * R1], 0.02, 0.012, 4);
  }
  // three tiers of paired elytra mirrors on every face (gold / iridescent / gold)
  [[0.8, 0.54], [1.38, 0.48], [1.92, 0.4]].forEach(([y, L], ti) => {
    const hw = rAt(y) * Math.SQRT1_2;
    for (let f = 0; f < 4; f++) {
      const a = f * HP, c = Math.cos(a), s = Math.sin(a), yaw = HP - a;
      for (const k of [-1, 1]) {
        const p = yawPt(c * hw, y, s * hw, yaw, k * hw * 0.52, 0, 0.004);
        put(b, ti === 1 ? m.chitinLight : m.metal, half(8), ...p, HP - lean - 0.07, yaw, 0, hw * 0.6, 0.07, L / 2);
      }
      put(b, m.chitinDark, new THREE.BoxGeometry(0.018, L * 0.92, 0.03), ...yawPt(c * hw, y, s * hw, yaw, 0, 0, 0.04), -lean, yaw);
    }
  });
  for (const y of [1.1, 1.66]) ring(b, m.team, rAt(y) + 0.012, 0.03, y, 4, 0, 0, Q);
  // golden claw setting and reflector petals holding the focusing gem
  ring(b, m.metal, R1 + 0.02, 0.03, Y1, 4, 0, 0, Q);
  for (let i = 0; i < 4; i++) {
    const a = Q + i * HP, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.metal, [[c * 0.12, Y1, s * 0.12, 0.028], [c * 0.19, Y1 + 0.2, s * 0.19, 0.022], [c * 0.09, Y1 + 0.44, s * 0.09, 0.012]], 5, false);
    const f = i * HP, fc = Math.cos(f), fs = Math.sin(f);
    put(b, m.chitinLight, half(6), fc * 0.13, Y1 + 0.06, fs * 0.13, HP + 0.7, HP - f + Math.PI, 0, 0.07, 0.025, 0.12);
  }
  root.add(b.build());
  const g = new PartBuilder();
  g.octa(m.photon, 0.14, 0, 0, 0, 1, 1.5, 1, 0, Q, 0);
  root.add(pivot('glowGem', g, 0, Y1 + 0.24, 0));
  root.add(marker('muzzle', 0, Y1 + 0.24, 0));
  return root;
}

/** Sepia Spore Emitter (gap generator) — 1×1, h 2.2. Bulbous bellows-like fungal organ puffing black spores. */
export function buildSepiaEmitter(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  const O8 = Math.PI / 8, S10 = Math.PI / 10;
  b.cyl(m.chitinDark, 0.44, 0.48, 0.1, 8, 0, 0.05, 0, 0, O8, 0);
  ring(b, m.team, 0.475, 0.032, 0.05, 8, 0, 0, O8);
  ring(b, m.metal, 0.43, 0.022, 0.1, 8, 0, 0, O8);
  // mycelial roots creeping over the plinth, chitin stilts cradling the organ
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.flesh, [[c * 0.16, 0.42, s * 0.16, 0.035], [c * 0.3, 0.2, s * 0.3, 0.025], [c * 0.43, 0.11, s * 0.43, 0.015]], 4, false);
  }
  stilts(b, m.chitin, 0, 0, 0.2, 3, 0.45, 0.035, 0.45, m.metal, Math.PI / 6);
  // neck, gold rings, glowing warning beads, flared fungal mouth with a sooty throat
  lathe(b, m.chitin, [[0.16, 1.4], [0.12, 1.6], [0.1, 1.78], [0.12, 1.88]], 8);
  ring(b, m.metal, 0.125, 0.025, 1.6, 8);
  ring(b, m.team, 0.11, 0.03, 1.74, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.ellipsoid(m.organ, 0.022, 0.022, 0.022, Math.cos(a) * 0.12, 1.67, Math.sin(a) * 0.12, 4);
  }
  lathe(b, m.flesh, [[0.12, 1.86], [0.17, 1.95], [0.24, 2.02], [0.28, 2.06]], 10);
  lathe(b, m.dark, [[0.28, 2.06], [0.22, 2.04], [0.12, 1.98], [0.0, 1.96]], 10);
  ring(b, m.chitinDark, 0.275, 0.018, 2.06, 10, 0, 0, S10);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.bone, [c * 0.13, 1.9, s * 0.13], [c * 0.26, 2.03, s * 0.26], 0.012, 0.006, 3);
  }
  // black spore puffs billowing over the vent
  sacs(b, m.dark, 0, 2.08, 0, 9, 0.075, 0.16, 5);
  // gold feed valves from the side bladders into the bellows
  for (const sx of [-1, 1]) b.taper(m.metal, [sx * 0.28, 0.48, -0.1], [sx * 0.2, 0.64, -0.05], 0.03, 0.025, 5);
  root.add(b.build());

  // the bellows: pleated fungal organ with chitin-bound folds and spore pores
  const bp = [[0.12, -0.5], [0.27, -0.44], [0.35, -0.33], [0.29, -0.23], [0.39, -0.11], [0.31, 0.0], [0.4, 0.12], [0.31, 0.24], [0.35, 0.33], [0.25, 0.44], [0.13, 0.52]];
  const bl = new PartBuilder();
  lathe(bl, m.flesh, bp, 10);
  ring(bl, m.chitin, 0.3, 0.035, -0.23, 10, 0, 0, S10);
  ring(bl, m.team, 0.32, 0.045, 0.0, 10, 0, 0, S10);
  ring(bl, m.chitin, 0.32, 0.035, 0.24, 10, 0, 0, S10);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + (i % 2) * 0.3, y = i % 2 ? 0.12 : -0.11, r = i % 2 ? 0.4 : 0.39;
    bl.ellipsoid(m.dark, 0.035, 0.028, 0.035, Math.cos(a) * r, y, Math.sin(a) * r, 5);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    bl.ellipsoid(m.metal, 0.03, 0.05, 0.03, Math.cos(a) * 0.305, 0.0, Math.sin(a) * 0.305, 5);
  }
  root.add(pivot('pulseBellows', bl, 0, 0.95, 0));
  // side bladders that pump the bellows
  for (const [sx, nm] of [[-1, 'pulseSacL'], [1, 'pulseSacR']]) {
    const sb = new PartBuilder();
    sb.ellipsoid(m.flesh, 0.12, 0.15, 0.12, 0, 0, 0, 8);
    sb.torus(m.chitinDark, 0.11, 0.02, 3, 10, 0, -0.04, 0, HP, 0, 0);
    sb.ellipsoid(m.dark, 0.05, 0.035, 0.05, 0, 0.13, 0, 5);
    sb.ellipsoid(m.organ, 0.025, 0.025, 0.025, sx * 0.1, 0.05, 0.05, 4);
    root.add(pivot(nm, sb, sx * 0.33, 0.38, -0.12));
  }
  root.add(marker('smoke', 0, 2.12, 0));
  return root;
}

export const MODELS = {
  stinkChamber: buildStinkChamber,
  skyPiercer: buildSkyPiercer,
  jewelObelisk: buildJewelObelisk,
  sepiaEmitter: buildSepiaEmitter,
};

void spikes;
