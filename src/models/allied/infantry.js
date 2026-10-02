// ALLIED infantry — upright soldier insects, ~0.42 tall, iridescent chitin with team shoulder plates.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, eyes, chain, spikes, bipedLegs, arms, antennae, wings, mandibles, scorpionTail } from '../insectKit.js';

const F = 'allied';

// ------------------------------------------------------------------ local helpers

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/** Euler angles that turn the +Z axis toward `dir`. */
function aimZ(dir) {
  _q.setFromUnitVectors(AXIS_Z, new THREE.Vector3(...dir).normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x, _e.y, _e.z];
}

const lerp3 = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];

/** Ellipsoid stretched from point a to point c (its Z axis runs along the segment). */
function pod(b, mat, a, c, rx, ry, seg = 6) {
  const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  b.ellipsoid(mat, rx, ry, Math.hypot(...d) / 2, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, seg, ...aimZ(d));
}

/** Marking band wrapped over the top half of a shell with radii R centred at c, at offset dz along Z. */
function band(b, mat, R, c, dz, width, seg = 10, grow = 1.04) {
  const k = Math.sqrt(Math.max(0.04, 1 - (dz / R[2]) ** 2));
  const g = new THREE.CylinderGeometry(1, 1, width, seg, 1, true, Math.PI / 2, Math.PI);
  b.add(mat, g, [c[0], c[1], c[2] + dz], [Math.PI / 2, 0, 0], [R[0] * k * grow, 1, R[1] * k * grow]);
}

/**
 * Walker legs like insectKit.hexLegs, plus: per-pair arrays for x/y/reach/lift/r, a name offset `i0`
 * (so several calls get unique, gait-alternating names), segment counts and a decorator(b, side, i, knee, foot).
 */
function legs(mat, o = {}, deco = null) {
  const { pairs = 3, x = 0.15, y = 0.22, z0 = 0.18, dz = 0.18, reach = 0.32, lift = 0.12, r = 0.022,
    jointMat = null, footMat = null, spread = 0.5, seg = 5, jseg = 6, i0 = 0 } = o;
  const P = (v, i) => (Array.isArray(v) ? v[i] : v);
  const out = [];
  for (let i = 0; i < pairs; i++) {
    const k = i0 + i, z = z0 - i * dz;
    const fan = pairs === 1 ? 0 : (0.5 - i / (pairs - 1)) * spread;
    const xi = P(x, i), yi = P(y, i), re = P(reach, i), li = P(lift, i), ri = P(r, i);
    for (const s of [-1, 1]) {
      const b = new PartBuilder();
      const knee = [s * re * 0.5, li, fan * re * 0.5];
      const foot = [s * re, -yi + 0.015, fan * re];
      b.taper(mat, [0, 0, 0], knee, ri * 1.25, ri, seg);
      b.ellipsoid(jointMat || mat, ri * 1.3, ri * 1.3, ri * 1.3, ...knee, jseg);
      b.taper(mat, knee, foot, ri, ri * 0.4, seg);
      if (footMat) b.ellipsoid(footMat, ri * 0.9, ri * 0.6, ri * 0.9, ...foot, 5);
      if (deco) deco(b, s, i, knee, foot);
      const group = (k % 2 === 0) === (s < 0) ? 'A' : 'B';
      out.push(pivot(`hex${group}${k}${s < 0 ? 'L' : 'R'}`, b, s * xi, yi, z));
    }
  }
  return out;
}

/** Articulated limb pivot through local joints [[x,y,z,r], ...] (the first is the hip at the pivot origin). */
function limb(name, mat, at, pts, jointMat = null, seg = 5, jseg = 5, deco = null) {
  const b = new PartBuilder();
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i];
    b.taper(mat, [p[0], p[1], p[2]], [q[0], q[1], q[2]], p[3], q[3], seg);
    if (jointMat && i < pts.length - 1) b.ellipsoid(jointMat, q[3] * 1.3, q[3] * 1.3, q[3] * 1.3, q[0], q[1], q[2], jseg);
  }
  if (deco) deco(b);
  return pivot(name, b, ...at);
}

function unitRoot() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  return [root, body];
}

// ------------------------------------------------------------------ models

/** Carapace Strikebug (GI) — bipedal phalanx worker, dual scythes + spine projector. deployOn = bunker shield. */
export function buildStrikebug(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);

  const b = new PartBuilder();
  b.ellipsoid(m.chitin, 0.065, 0.085, 0.055, 0, 0.27, 0, 8);                 // thorax
  b.ellipsoid(m.chitinDark, 0.06, 0.055, 0.095, 0, 0.23, -0.085, 8, -0.5, 0, 0); // abdomen
  b.torus(m.chitinLight, 0.045, 0.01, 4, 8, 0, 0.245, -0.12, -0.5, 0, 0);
  b.dome(m.team, 0.042, 0.026, 0.045, -0.06, 0.31, 0, 6, 0, 0, 0.6);           // shoulder plates
  b.dome(m.team, 0.042, 0.026, 0.045, 0.06, 0.31, 0, 6, 0, 0, -0.6);
  b.ellipsoid(m.chitinLight, 0.042, 0.038, 0.046, 0, 0.375, 0.025, 8);        // head
  eyes(b, m.eye, 0, 0.385, 0.055, 0.019, 0.03);
  b.taper(m.chitinDark, [0, 0.355, 0.06], [0, 0.34, 0.085], 0.012, 0.004, 4); // mouthparts
  body.add(b.build());
  for (const a of antennae(m.chitinDark, { y: 0.41, z: 0.04, len: 0.13, spread: 0.015, r: 0.005 })) body.add(a);
  for (const a of arms(m.chitin, { x: 0.065, y: 0.31, z: 0.01, len: 0.13, r: 0.012 }, (ab, s, h) => {
    // scythe blade on both forearms
    ab.taper(m.chitinLight, h, [h[0] + s * 0.01, h[1] + 0.07, h[2] + 0.04], 0.011, 0.002, 4);
    if (s > 0) { // spine projector on the right arm
      ab.cyl(m.metal, 0.013, 0.016, 0.1, 6, h[0], h[1], h[2] + 0.035, Math.PI / 2, 0, 0);
      ab.ellipsoid(m.organ, 0.016, 0.016, 0.02, h[0], h[1] + 0.018, h[2] - 0.005, 5);
    }
  })) body.add(a);
  for (const l of bipedLegs(m.chitinDark, { x: 0.035, y: 0.2, r: 0.014, footMat: m.chitin })) root.add(l);
  body.add(marker('muzzle', 0.065, 0.265, 0.19));

  // deployed bunker: frontal carapace shield + ground spikes
  const d = new PartBuilder();
  d.dome(m.chitinLight, 0.2, 0.17, 0.08, 0, 0.17, 0.13, 10, Math.PI / 2, 0, 0);
  d.dome(m.team, 0.2, 0.05, 0.081, 0, 0.17, 0.132, 10, Math.PI / 2, 0, 0);
  spikes(d, m.chitinDark, [-0.16, 0.06, 0.16], [0.16, 0.06, 0.16], 5, 0.07, 0.015, [0, 0.3, 1]);
  d.dome(m.mud, 0.24, 0.05, 0.2, 0, 0, 0, 10);
  root.add(pivot('deployOn', d));
  return root;
}

/**
 * Pincer Halberdier (Guardian GI) — r 0.2, h 0.5. Heavily armoured quadruped beetle warrior: an elytra-shelled
 * hind body on four legs, a raised armoured forebody with pincer arms and twin chemical rail-horns on the head.
 * Deploy: `deployOn` = dorsal chitin tripod planted in the ground, `deployOnRails` = extended rail barrels.
 */
export function buildHalberdier(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // heavy armoured hind body: broad polished elytra over a dark underbody
  const EL = [0.125, 0.1, 0.16], ec = [0, 0.165, -0.08];
  b.ellipsoid(m.chitinDark, 0.1, 0.05, 0.15, 0, 0.165, -0.07, 6);
  b.dome(m.chitin, ...EL, ...ec, 10);
  b.ellipsoid(m.chitinDark, 0.008, EL[1] + 0.004, EL[2] + 0.004, ...ec, 5);    // elytra seam
  band(b, m.team, EL, ec, -0.035, 0.034);
  band(b, m.team, EL, ec, -0.1, 0.03);
  band(b, m.metal, EL, ec, 0.07, 0.016);                                        // gold front rim
  for (const s of [-1, 1]) spikes(b, m.chitinLight, [s * 0.118, 0.175, -0.02], [s * 0.1, 0.175, -0.17], 2, 0.04, 0.011, [s, 0.5, -0.3]);

  // raised armoured forebody
  b.ellipsoid(m.chitin, 0.078, 0.09, 0.07, 0, 0.27, 0.08, 8, 0.3, 0, 0);       // thorax
  b.dome(m.chitinLight, 0.095, 0.078, 0.085, 0, 0.28, 0.075, 8, 0.4, 0, 0);    // pronotum shield
  for (const s of [-1, 1]) b.dome(m.team, 0.05, 0.03, 0.056, s * 0.075, 0.32, 0.085, 6, 0, 0, -s * 0.65); // pauldrons
  b.ellipsoid(m.chitinLight, 0.046, 0.04, 0.05, 0, 0.37, 0.15, 7);             // head
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.017, 0.017, 0.017, s * 0.034, 0.378, 0.18, 6);
  // chemical reservoir feeding the rails
  b.ellipsoid(m.resin, 0.036, 0.03, 0.044, 0, 0.375, 0.05, 6);
  b.taper(m.metal, [0, 0.39, 0.08], [0, 0.405, 0.145], 0.007, 0.007, 4);

  // twin rail-horns with gold clamps and glowing chemical coils
  const R0 = 0.395, R1 = 0.44, Z0 = 0.145, Z1 = 0.36;
  const pitch = -Math.atan2(R1 - R0, Z1 - Z0);
  for (const s of [-1, 1]) b.taper(m.chitinLight, [s * 0.025, R0, Z0], [s * 0.025, R1, Z1], 0.018, 0.009, 5);
  for (const t of [0.25, 0.55, 0.85]) {
    const p = lerp3([0, R0, Z0], [0, R1, Z1], t);
    b.box(m.metal, 0.074, 0.014, 0.014, ...p, pitch, 0, 0);
  }
  for (const t of [0.4, 0.7]) b.ellipsoid(m.organ, 0.013, 0.013, 0.015, ...lerp3([0, R0, Z0], [0, R1, Z1], t), 5);
  body.add(b.build());
  body.add(marker('muzzle', 0, R1 + 0.002, Z1 + 0.012));

  // pincer arms (raise when firing)
  for (const a of arms(m.chitin, { x: 0.085, y: 0.29, z: 0.11, len: 0.12, r: 0.014, jointMat: m.metal }, (ab, s, h) => {
    ab.ellipsoid(m.chitinDark, 0.02, 0.018, 0.026, ...h, 5);
    ab.taper(m.chitinLight, [h[0], h[1] + 0.008, h[2] + 0.01], [h[0] - s * 0.008, h[1] + 0.02, h[2] + 0.062], 0.011, 0.002, 4);
    ab.taper(m.chitinLight, [h[0], h[1] - 0.008, h[2] + 0.01], [h[0] - s * 0.008, h[1] - 0.016, h[2] + 0.052], 0.009, 0.002, 4);
  })) body.add(a);
  for (const a of antennae(m.chitinDark, { y: 0.4, z: 0.165, len: 0.08, spread: 0.04, r: 0.005 })) body.add(a);

  // four stout armoured walking legs (armoured femur plates)
  for (const l of legs(m.chitinDark, { pairs: 2, x: 0.08, y: 0.15, z0: 0.05, dz: 0.18, reach: 0.17, lift: 0.05, r: 0.021, spread: 0.7, jointMat: m.metal, seg: 4, jseg: 5 }, (lb, s, i, k) => {
    pod(lb, m.chitin, lerp3([0, 0, 0], k, 0.1), lerp3([0, 0, 0], k, 1.05), 0.026, 0.02, 5);
  })) root.add(l);

  // deployed: dorsal chitin tripod brace driven into the ground
  const d = new PartBuilder();
  const HY = 0.29;
  d.ellipsoid(m.metal, 0.032, 0.024, 0.032, 0, 0, 0, 5);
  for (const [kx, kz, fx, fz] of [[0, -0.13, 0, -0.24], [-0.11, -0.04, -0.19, -0.12], [0.11, -0.04, 0.19, -0.12]]) {
    const knee = [kx, 0.07, kz], foot = [fx, -HY + 0.03, fz];
    d.taper(m.chitinLight, [0, 0, 0], knee, 0.02, 0.016, 4);
    d.ellipsoid(m.team, 0.02, 0.02, 0.02, ...knee, 5);
    d.taper(m.chitinLight, knee, foot, 0.016, 0.009, 4);
    d.cone(m.metal, 0.016, 0.04, 4, foot[0], foot[1] - 0.005, foot[2], Math.PI, 0, 0);
  }
  root.add(pivot('deployOn', d, 0, HY, -0.1));

  // deployed: rail-horn barrels slide out
  const e = new PartBuilder();
  const ext = [0, Math.sin(-pitch) * 0.1, Math.cos(pitch) * 0.1];
  for (const s of [-1, 1]) {
    e.taper(m.metal, [s * 0.025, 0, 0], [s * 0.025, ext[1], ext[2]], 0.009, 0.007, 4);
    e.ellipsoid(m.organ, 0.01, 0.01, 0.01, s * 0.025, ext[1], ext[2], 5);
  }
  e.box(m.metal, 0.074, 0.012, 0.012, 0, ext[1] * 0.5, ext[2] * 0.5, pitch, 0, 0);
  body.add(pivot('deployOnRails', e, 0, R1, Z1));
  return root;
}

/**
 * Dragon-Wasp (Rocketeer) — r 0.22, h 0.4, hover. Slender aero-hornet flying horizontally on two pairs of
 * iridescent wings, striped team gaster, twin ventral spine pods under the thorax (muzzle between them).
 */
export function buildDragonWasp(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();
  const Y = 0.2;

  // thorax with team scutum
  b.ellipsoid(m.chitin, 0.048, 0.046, 0.068, 0, Y, 0.04, 8);
  b.ellipsoid(m.team, 0.032, 0.022, 0.048, 0, Y + 0.03, 0.045, 6);
  b.ellipsoid(m.chitinLight, 0.012, 0.014, 0.02, 0, Y + 0.046, 0.05, 5);
  // head with wrap-around compound eyes
  b.ellipsoid(m.chitinLight, 0.034, 0.03, 0.03, 0, Y + 0.008, 0.125, 8);
  eyes(b, m.eye, 0, Y + 0.018, 0.13, 0.024, 0.026);
  for (const s of [-1, 1]) b.taper(m.metal, [s * 0.012, Y - 0.012, 0.15], [s * 0.003, Y - 0.024, 0.178], 0.006, 0.002, 4);
  // petiole + long striped gaster + gold stinger
  b.taper(m.chitinDark, [0, Y, -0.02], [0, Y - 0.005, -0.075], 0.014, 0.008, 5);
  for (let i = 0; i < 6; i++) {
    const r = 0.03 - i * 0.0032;
    b.ellipsoid(i % 2 ? m.team : m.chitinDark, r, r * 0.9, 0.034, 0, Y - 0.006 - i * 0.005, -0.1 - i * 0.052, 6);
  }
  b.ellipsoid(m.organ, 0.012, 0.01, 0.018, 0, Y - 0.045, -0.36, 5);           // firefly lantern
  b.taper(m.metal, [0, Y - 0.035, -0.38], [0, Y - 0.05, -0.44], 0.01, 0.002, 4);

  // ventral spine pods
  for (const s of [-1, 1]) {
    const px = s * 0.028, py = Y - 0.06;
    b.ellipsoid(m.metal, 0.017, 0.017, 0.04, px, py, 0.05, 6);
    b.cyl(m.chitinDark, 0.009, 0.012, 0.04, 5, px, py, 0.1, Math.PI / 2, 0, 0);
    b.taper(m.chitinLight, [px, py, 0.115], [px, py, 0.14], 0.006, 0.002, 4);
    b.ellipsoid(m.organ, 0.011, 0.011, 0.015, px, py + 0.004, 0.005, 5);
  }
  b.box(m.metal, 0.07, 0.012, 0.02, 0, Y - 0.043, 0.05);                        // pod yoke
  // legs tucked up under the thorax
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      chain(b, m.chitinDark, [[s * 0.025, Y - 0.03, 0.07 - i * 0.03, 0.006], [s * 0.065, Y - 0.07, 0.09 - i * 0.045, 0.005], [s * 0.05, Y - 0.13, 0.05 - i * 0.07, 0.003]], 4, false);
    }
  }
  body.add(b.build());
  body.add(marker('muzzle', 0, Y - 0.06, 0.145));

  for (const w of wings(m.membrane, { pairs: 2, x: 0.025, y: Y + 0.035, z: 0.075, len: 0.34, width: 0.085, sweep: 0.1, tilt: 0.06, pairGap: 0.065 }, m.chitinLight)) body.add(w);
  for (const a of antennae(m.chitinDark, { y: Y + 0.03, z: 0.14, len: 0.1, spread: 0.012, r: 0.004, tipMat: m.organ })) body.add(a);
  return root;
}

/**
 * Phase-Shift Tick (Chrono Legionnaire) — temporal flea. Laterally compressed translucent membrane body with
 * sclerite hoops over a glowing chrono core, multi-jointed legs with huge folded jumping hind legs, a chrono
 * emitter proboscis (muzzle) and precessing distortion rings.
 */
export function buildPhaseTick(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();
  const C = [0, 0.25, -0.02], R = [0.058, 0.105, 0.125];

  // translucent shell + sclerite hoops (alternating team) + dorsal ridge
  b.ellipsoid(m.membrane, ...R, ...C, 10);
  for (let i = 0; i < 5; i++) {
    const dz = -0.084 + i * 0.042;
    const k = Math.sqrt(1 - (dz / R[2]) ** 2);
    b.add(i % 2 ? m.team : m.chitinLight, new THREE.TorusGeometry(1, 0.1, 3, 12), [C[0], C[1], C[2] + dz], [0, 0, 0], [R[0] * k * 1.02, R[1] * k * 1.02, 0.12]);
  }
  b.ellipsoid(m.chitinLight, 0.012, R[1] + 0.006, R[2] - 0.01, ...C, 6);     // dorsal keel
  // head + chrono emitter
  b.ellipsoid(m.chitinLight, 0.035, 0.045, 0.04, 0, 0.21, 0.115, 8);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.012, 0.012, 0.012, s * 0.03, 0.225, 0.13, 5);
  b.taper(m.chitinDark, [0, 0.19, 0.145], [0, 0.172, 0.2], 0.012, 0.007, 5);
  b.torus(m.metal, 0.022, 0.005, 3, 10, 0, 0.17, 0.2, 0, 0, 0);
  b.octa(m.chrono, 0.018, 0, 0.17, 0.215, 1, 1, 1.6);
  body.add(b.build());
  body.add(marker('muzzle', 0, 0.17, 0.25));

  // chrono core seen through the shell (slow pulse)
  const core = new PartBuilder();
  core.ellipsoid(m.chrono, 0.028, 0.055, 0.068, 0, 0, 0, 8);
  core.ellipsoid(m.photon, 0.014, 0.022, 0.024, 0, 0.01, 0.02, 5);
  body.add(pivot('pulseCore', core, ...C));

  // distortion rings precessing around the body
  const h = new PartBuilder();
  h.torus(m.chrono, 0.17, 0.004, 3, 16, 0, 0, 0, Math.PI / 2 + 0.4, 0, 0);
  h.torus(m.chrono, 0.135, 0.003, 3, 14, 0, 0.02, 0, Math.PI / 2 - 0.5, 0.7, 0);
  const halo = pivot('spinYHalo', h, ...C);
  halo.userData.speed = 3;
  body.add(halo);
  for (const a of antennae(m.chitinDark, { y: 0.24, z: 0.13, len: 0.07, spread: 0.02, r: 0.004, tipMat: m.chrono })) body.add(a);

  // multi-jointed legs: two short front pairs + huge folded jumping legs
  for (const l of legs(m.chitinLight, { pairs: 2, x: 0.03, y: 0.17, z0: 0.08, dz: 0.065, reach: 0.15, lift: 0.05, r: 0.008, spread: 0.9, jointMat: m.chrono, seg: 4, jseg: 5 })) root.add(l);
  for (const s of [-1, 1]) {
    const knee = [s * 0.055, 0.095, -0.065];
    root.add(limb(s < 0 ? 'hexA2L' : 'hexB2R', m.chitinLight, [s * 0.045, 0.19, -0.06], [
      [0, 0, 0, 0.02], [...knee, 0.016], [s * 0.075, -0.06, -0.16, 0.01], [s * 0.085, -0.175, -0.09, 0.005],
    ], m.chrono, 5, 5, (lb) => {
      pod(lb, m.chitinLight, [0, -0.01, 0.005], knee, 0.026, 0.03, 6);            // bulging jumping femur
      pod(lb, m.team, lerp3([0, 0, 0], knee, 0.45), lerp3([0, 0, 0], knee, 0.62), 0.029, 0.033, 5);
    }));
  }
  return root;
}

/**
 * Mimic Phasmid (Spy) — slender upright stick/leaf insect: twig-thin limbs, leafy flaps along the abdomen
 * and head crest, chromatophore spots (team / glow / firefly) that let it mimic other units. No weapon.
 */
export function buildMimicPhasmid(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // stick-thin upright thorax and trailing abdomen
  b.taper(m.chitinLight, [0, 0.22, -0.005], [0, 0.415, 0.02], 0.02, 0.014, 6);
  for (const [y0, y1] of [[0.28, 0.31], [0.34, 0.37]]) b.taper(m.team, [0, y0, 0.002 + (y0 - 0.22) * 0.13], [0, y1, 0.002 + (y1 - 0.22) * 0.13], 0.0215, 0.02, 6); // chromatophore rings
  b.ellipsoid(m.chitin, 0.022, 0.03, 0.022, 0, 0.25, 0, 6);
  chain(b, m.chitinLight, [[0, 0.235, -0.01, 0.02], [0, 0.2, -0.1, 0.018], [0, 0.15, -0.19, 0.013], [0, 0.11, -0.26, 0.007]], 6, true);
  // leafy flaps down the abdomen
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      b.leaf(i % 2 ? m.fern : m.fernLight, 0.1 - i * 0.012, 0.055, 3, 0.5, s * 0.012, 0.215 - i * 0.045, -0.06 - i * 0.075, s * (Math.PI / 2 + 0.55), 0.3);
    }
    b.leaf(m.fernLight, 0.07, 0.04, 2, 0.4, s * 0.012, 0.37, 0.0, s * (Math.PI / 2 + 0.9), 0.5);   // shoulder fronds
  }
  b.leaf(m.fern, 0.08, 0.05, 3, 0.6, 0, 0.12, -0.26, Math.PI, 0.2);                                   // tail frond
  // head, crest and eyes
  b.ellipsoid(m.chitin, 0.022, 0.024, 0.036, 0, 0.432, 0.035, 6, -0.3, 0, 0);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.009, 0.009, 0.009, s * 0.018, 0.44, 0.05, 5);
  b.leaf(m.fernLight, 0.07, 0.045, 3, 1.0, 0, 0.452, 0.04, Math.PI, -0.5);
  // chromatophore spots (team colour dominates — the disguise palette)
  const spots = [
    [0, 0.3, 0.017, m.team], [0, 0.36, 0.022, m.team], [0.014, 0.27, 0.012, m.glow], [-0.014, 0.33, 0.016, m.organ],
    [0, 0.226, -0.045, m.team], [0, 0.205, -0.1, m.glow], [0, 0.18, -0.145, m.team], [0, 0.152, -0.19, m.organ],
    [0.012, 0.425, 0.05, m.team], [-0.012, 0.425, 0.05, m.team],
  ];
  for (const [x, y, z, mt] of spots) b.ellipsoid(mt, 0.013, 0.013, 0.013, x, y, z, 5);
  // chromatophore eye-spots on the leaf flaps
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) b.ellipsoid(i === 1 ? m.glow : m.team, 0.015, 0.007, 0.013, s * 0.045, 0.207 - i * 0.045, -0.078 - i * 0.075, 5);
  }
  b.ellipsoid(m.team, 0.026, 0.012, 0.022, 0, 0.402, 0.018, 6);                  // team collar
  // middle legs splayed out as a tripod brace
  for (const s of [-1, 1]) chain(b, m.chitinLight, [[s * 0.015, 0.26, -0.01, 0.006], [s * 0.1, 0.22, 0.01, 0.005], [s * 0.14, 0.012, 0.03, 0.003]], 4, false);
  body.add(b.build());

  for (const a of arms(m.chitinLight, { x: 0.026, y: 0.39, z: 0.02, len: 0.16, r: 0.007, jointMat: m.chitin }, (ab, s, hd) => {
    ab.ellipsoid(m.team, 0.005, 0.024, 0.036, hd[0] + s * 0.004, hd[1] + 0.03, hd[2] - 0.04, 5, 0.5, 0, 0); // chromatophore forearm lobe
    ab.taper(m.chitinDark, hd, [hd[0], hd[1] - 0.012, hd[2] + 0.03], 0.005, 0.001, 3);
  })) body.add(a);
  for (const a of antennae(m.chitinDark, { y: 0.45, z: 0.06, len: 0.2, spread: 0.01, curve: 0.3, r: 0.003 })) body.add(a);
  for (const l of bipedLegs(m.chitinLight, { x: 0.022, y: 0.22, r: 0.008, knee: 0.04, jointMat: m.chitin, footMat: m.chitinDark })) root.add(l);
  return root;
}

/**
 * Hydro-Scorpion Commando (Navy SEAL) — r 0.2. Sleek black amphibious scorpion: glossy segmented plates with
 * team bands, raised sting tail (`tail`), spine-dart launchers on both chelae (muzzle on the right claw),
 * glowing caustic gland sacks on the flanks.
 */
export function buildHydroScorpion(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();
  const Y = 0.11;

  // prosoma: sleek black carapace with median eyes
  b.ellipsoid(m.chitinDark, 0.065, 0.035, 0.07, 0, Y, 0.06, 8);
  b.dome(m.dark, 0.072, 0.045, 0.078, 0, Y, 0.06, 8);
  b.ellipsoid(m.chitinLight, 0.006, 0.047, 0.06, 0, Y, 0.06, 5);              // iridescent ridge
  b.dome(m.team, 0.05, 0.047, 0.03, 0, Y, 0.03, 6);                             // team collar plate
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.009, 0.009, 0.009, s * 0.012, Y + 0.043, 0.085, 5);
  // mesosoma: overlapping plates, team bands
  for (let i = 0; i < 4; i++) {
    const z = -0.005 - i * 0.045, k = 1 - i * 0.07;
    b.ellipsoid(m.chitinDark, 0.068 * k, 0.03, 0.03, 0, Y, z, 5);
    b.dome(i % 2 ? m.team : m.dark, 0.074 * k, 0.046 * k, 0.03, 0, Y, z, 6);
  }
  // caustic gland sacks strapped to the flanks
  for (const s of [-1, 1]) {
    b.ellipsoid(m.acid, 0.022, 0.02, 0.028, s * 0.066, Y + 0.018, -0.05, 6);
    b.ellipsoid(m.acid, 0.017, 0.016, 0.022, s * 0.058, Y + 0.02, -0.105, 5);
    b.taper(m.metal, [s * 0.04, Y + 0.04, -0.05], [s * 0.085, Y + 0.012, -0.05], 0.005, 0.005, 4);
  }
  // pedipalps with heavy chelae and spine-dart launchers
  for (const s of [-1, 1]) {
    const sh = [s * 0.05, Y, 0.1], el = [s * 0.11, Y + 0.012, 0.15], ch = [s * 0.088, Y + 0.016, 0.225];
    b.taper(m.chitinDark, sh, el, 0.014, 0.012, 5);
    b.ellipsoid(m.chitinLight, 0.014, 0.014, 0.014, ...el, 5);
    b.taper(m.chitinDark, el, [ch[0], ch[1], ch[2] - 0.03], 0.012, 0.016, 5);
    b.ellipsoid(m.dark, 0.026, 0.02, 0.04, ...ch, 6);
    b.ellipsoid(m.team, 0.02, 0.012, 0.03, ch[0] + s * 0.008, ch[1] + 0.012, ch[2] - 0.004, 5);  // team claw plate
    b.taper(m.dark, [ch[0] + s * 0.008, ch[1], ch[2] + 0.03], [ch[0] - s * 0.01, ch[1] + 0.004, ch[2] + 0.085], 0.012, 0.002, 4);
    b.taper(m.chitinDark, [ch[0] - s * 0.012, ch[1] - 0.004, ch[2] + 0.03], [ch[0] - s * 0.018, ch[1] - 0.002, ch[2] + 0.075], 0.009, 0.002, 4);
    b.cyl(m.metal, 0.007, 0.009, 0.06, 5, ch[0], ch[1] + 0.022, ch[2] + 0.012, Math.PI / 2, 0, 0);
    b.ellipsoid(m.organ, 0.008, 0.008, 0.012, ch[0], ch[1] + 0.022, ch[2] - 0.024, 5);
  }
  body.add(b.build());
  body.add(marker('muzzle', 0.088, Y + 0.038, 0.27));
  body.add(scorpionTail(m.dark, m.acid, { y: Y + 0.012, z: -0.16, segments: 5, len: 0.28, r: 0.022, height: 0.28, curl: 1.15 }));

  for (const l of legs(m.chitinDark, { pairs: 4, x: 0.045, y: Y, z0: 0.065, dz: 0.055, reach: 0.17, lift: 0.06, r: 0.009, spread: 1.0, jointMat: m.chitinLight, seg: 4, jseg: 5 })) root.add(l);
  return root;
}

/**
 * Queen Vespidia (Tanya, HERO) — h 0.6. Regal wasp-mantis chimera: gold crown on a mantis head, team
 * pauldrons, raptorial razor arms carrying neuro-dart launchers (muzzle on the right claw), two pairs of
 * gold-veined wings raised like a cape and a striped wasp gaster with stinger.
 */
export function buildQueenVespidia(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // pelvis, waist and striped gaster hanging behind
  b.ellipsoid(m.chitinDark, 0.05, 0.035, 0.045, 0, 0.29, 0, 8);
  b.taper(m.chitinDark, [0, 0.3, -0.03], [0, 0.28, -0.07], 0.014, 0.01, 5);
  const gA = [0, 0.28, -0.07], gB = [0, 0.16, -0.27];
  const gR = [0.04, 0.056, 0.06, 0.05, 0.033];
  const gM = [m.chitin, m.team, m.chitin, m.team, m.chitinDark];
  for (let i = 0; i < 5; i++) {
    const p = lerp3(gA, gB, (i + 0.5) / 5), d = 0.05;
    pod(b, gM[i], lerp3(p, gB, -d / 0.23), lerp3(p, gB, d / 0.23 * 0.9), gR[i], gR[i] * 0.92, 6);
  }
  b.taper(m.metal, gB, lerp3(gA, gB, 1.28), 0.012, 0.002, 4);                // stinger
  // upright thorax, breastplate, gold gorget and team pauldrons
  b.ellipsoid(m.chitin, 0.058, 0.075, 0.052, 0, 0.385, 0, 8);
  b.dome(m.chitinLight, 0.06, 0.05, 0.05, 0, 0.39, 0.012, 8, 0.7, 0, 0);
  b.torus(m.metal, 0.032, 0.008, 3, 10, 0, 0.455, 0.008, Math.PI / 2, 0, 0);
  for (const s of [-1, 1]) {
    b.dome(m.team, 0.048, 0.03, 0.052, s * 0.058, 0.435, 0, 6, 0, 0, -s * 0.7);
    b.dome(m.metal, 0.028, 0.02, 0.034, s * 0.075, 0.447, 0, 6, 0, 0, -s * 0.95);
  }
  // mantis head, wide eyes, crown
  b.ellipsoid(m.chitinLight, 0.045, 0.034, 0.036, 0, 0.495, 0.03, 8);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.02, 0.022, 0.02, s * 0.042, 0.505, 0.035, 6);
  b.taper(m.chitinDark, [0, 0.48, 0.06], [0, 0.465, 0.085], 0.014, 0.004, 4);
  b.torus(m.metal, 0.028, 0.006, 3, 10, 0, 0.525, 0.028, Math.PI / 2, 0, 0);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    b.taper(m.metal, [c * 0.026, 0.525, 0.028 + s * 0.026], [c * 0.04, i === 0 ? 0.61 : 0.585, 0.028 + s * 0.04], 0.008, 0.001, 4);
  }
  b.octa(m.glow, 0.013, 0, 0.537, 0.058);
  body.add(b.build());
  body.add(marker('muzzle', 0.082, 0.352, 0.2));

  // raptorial razor arms with neuro-dart launchers
  for (const a of arms(m.chitin, { x: 0.068, y: 0.42, z: 0.03, len: 0.17, r: 0.013, jointMat: m.metal }, (ab, s, h) => {
    ab.taper(m.chitinLight, h, [h[0], h[1] + 0.035, h[2] + 0.11], 0.013, 0.002, 4);
    spikes(ab, m.chitinLight, [h[0], h[1] + 0.008, h[2] + 0.025], [h[0], h[1] + 0.025, h[2] + 0.08], 3, 0.018, 0.004, [0, -1, 0.3]);
    ab.cyl(m.metal, 0.008, 0.011, 0.06, 6, h[0] + s * 0.014, h[1] - 0.008, h[2] + 0.01, Math.PI / 2, 0, 0);
    ab.ellipsoid(m.organ, 0.01, 0.01, 0.014, h[0] + s * 0.014, h[1] - 0.008, h[2] - 0.026, 5);
  })) body.add(a);
  for (const w of wings(m.membrane, { pairs: 2, x: 0.025, y: 0.43, z: -0.035, len: 0.26, width: 0.07, sweep: 0.75, tilt: 0.35, pairGap: 0.025 }, m.metal)) body.add(w);
  for (const a of antennae(m.chitinDark, { y: 0.52, z: 0.055, len: 0.12, spread: 0.015, r: 0.004, tipMat: m.organ })) body.add(a);
  for (const l of bipedLegs(m.chitinDark, { x: 0.042, y: 0.27, r: 0.014, knee: 0.06, jointMat: m.metal, footMat: m.chitin })) root.add(l);
  return root;
}

/**
 * Strider Hunting Mite (Attack Dog) — r 0.18, h 0.3. Fast six-legged predatory mite: round idiosoma with a team
 * dorsal shield, glowing hunter eyes, snapping chelicerae (`mandL/mandR`) and long sensory whiskers.
 */
export function buildStriderMite(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();
  const C = [0, 0.165, -0.02];

  b.ellipsoid(m.chitin, 0.085, 0.065, 0.105, ...C, 10);                       // idiosoma
  b.dome(m.team, 0.078, 0.07, 0.095, C[0], C[1], C[2] - 0.005, 8);             // dorsal shield
  b.ellipsoid(m.chitinLight, 0.008, 0.073, 0.07, C[0], C[1], C[2] - 0.01, 5);   // shield ridge
  // gnathosoma + glowing hunter eyes
  b.ellipsoid(m.chitinDark, 0.032, 0.028, 0.04, 0, 0.15, 0.09, 8);
  for (const s of [-1, 1]) {
    b.ellipsoid(m.organ, 0.011, 0.011, 0.011, s * 0.028, 0.205, 0.065, 5);
    b.ellipsoid(m.eye, 0.012, 0.012, 0.012, s * 0.052, 0.19, 0.055, 5);
  }
  // bristling setae along the flanks
  for (const s of [-1, 1]) spikes(b, m.chitinLight, [s * 0.07, 0.2, 0.03], [s * 0.065, 0.2, -0.09], 3, 0.05, 0.004, [s, 1.2, -0.5]);
  spikes(b, m.chitinLight, [0, 0.225, -0.06], [0, 0.215, -0.11], 2, 0.04, 0.004, [0, 1, -0.6]);
  body.add(b.build());
  body.add(marker('muzzle', 0, 0.145, 0.17));
  for (const a of mandibles(m.chitinLight, { x: 0.02, y: 0.145, z: 0.115, len: 0.06, r: 0.009, curve: 0.7, teethMat: m.metal })) body.add(a);
  for (const a of antennae(m.chitinLight, { y: 0.17, z: 0.11, len: 0.18, spread: 0.022, curve: 0.15, r: 0.0035, tipMat: m.organ })) body.add(a);

  for (const l of legs(m.chitinDark, { pairs: 3, x: 0.055, y: 0.16, z0: 0.05, dz: 0.065, reach: 0.25, lift: 0.09, r: 0.012, spread: 1.1, jointMat: m.team })) root.add(l);
  return root;
}

export const MODELS = {
  strikebug: buildStrikebug,
  halberdier: buildHalberdier,
  dragonWasp: buildDragonWasp,
  phaseTick: buildPhaseTick,
  mimicPhasmid: buildMimicPhasmid,
  hydroScorpion: buildHydroScorpion,
  queenVespidia: buildQueenVespidia,
  striderMite: buildStriderMite,
};
