// ALLIED vehicles — Hymenoptera & Elytra Bio-Tech: polished iridescent teal chitin, gold fittings,
// amber resin, firefly-glow organs and team-coloured bands. Walkers: legs on the root, hull in `body`.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, chain, spikes, sacs, antennae, mandibles } from '../insectKit.js';

const F = 'allied';

// ------------------------------------------------------------------ local helpers

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const AXIS_Y = new THREE.Vector3(0, 1, 0);

/** Euler angles that turn `axis` toward `dir`. */
function aim(axis, dir) {
  _q.setFromUnitVectors(axis, new THREE.Vector3(...dir).normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x, _e.y, _e.z];
}

const lerp3 = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];

/** Ellipsoid stretched from a to c whose width (rx) stays horizontal: leaf lobes, oar blades, petals. */
function slab(b, mat, a, c, w, t, seg = 6) {
  const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const len = Math.hypot(...d);
  _e.set(-Math.asin(d[1] / len), Math.atan2(d[0], d[2]), 0, 'YXZ');
  _q.setFromEuler(_e);
  _e.setFromQuaternion(_q, 'XYZ');
  b.ellipsoid(mat, w, t, len / 2, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, seg, _e.x, _e.y, _e.z);
}

/** Marking band wrapped over the top half of a shell with radii R centred at c, at offset dz along Z. */
function band(b, mat, R, c, dz, width, seg = 12, grow = 1.04) {
  const k = Math.sqrt(Math.max(0.04, 1 - (dz / R[2]) ** 2));
  const g = new THREE.CylinderGeometry(1, 1, width, seg, 1, true, Math.PI / 2, Math.PI);
  b.add(mat, g, [c[0], c[1], c[2] + dz], [Math.PI / 2, 0, 0], [R[0] * k * grow, 1, R[1] * k * grow]);
}

/** Point on the upper surface of an ellipsoid shell (radii R, centre c) above (x, z), plus its outward normal. */
function onShell(R, c, x, z) {
  const u = x / R[0], w = (z - c[2]) / R[2];
  const h = Math.sqrt(Math.max(0, 1 - u * u - w * w));
  const p = [x, c[1] + R[1] * h, z];
  const n = new THREE.Vector3(u / R[0], h / R[1], w / R[2]).normalize();
  return { p, n: [n.x, n.y, n.z] };
}

/** Convex focusing lens facing `dir`: gold rim, glowing photon core under a glass cap. Returns the lens apex. */
function lens(b, m, p, dir, r, seg = 10) {
  const rot = aim(AXIS_Y, dir);
  const n = new THREE.Vector3(...dir).normalize();
  b.cyl(m.metal, r * 1.15, r * 1.25, r * 0.4, seg, ...p, ...rot);
  const q = [p[0] + n.x * r * 0.18, p[1] + n.y * r * 0.18, p[2] + n.z * r * 0.18];
  b.dome(m.photon, r * 0.92, r * 0.5, r * 0.92, ...q, seg, ...rot);
  b.dome(m.glass, r * 1.02, r * 0.75, r * 1.02, ...q, seg, ...rot);
  return [q[0] + n.x * r * 0.75, q[1] + n.y * r * 0.75, q[2] + n.z * r * 0.75];
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
      out.push(pivot(`hex${legGroup(k, s)}${k}${s < 0 ? 'L' : 'R'}`, b, s * xi, yi, z));
    }
  }
  return out;
}

/** Tripod gait group for pair index k on side s. */
const legGroup = (k, s) => ((k % 2 === 0) === (s < 0) ? 'A' : 'B');

/** Articulated limb pivot through local joints [[x,y,z,r], ...] (the first is the hip at the pivot origin). */
function limb(name, mat, at, pts, jointMat = null, seg = 5, jseg = 6, deco = null) {
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

/**
 * Quantum Scarab Harvester (Chrono Miner) — r 0.5, h 0.8. Round dung beetle with a gold shovel clypeus,
 * a gold-rimmed cradle on its back holding the crystalline nutrient cluster (`cargo`, origin on the cradle floor)
 * and a glowing tachyon gland on its abdomen tip (teleport home).
 */
export function buildScarabHarvester(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // round elytra hull
  const EL = [0.4, 0.29, 0.46], ec = [0, 0.3, -0.08];
  b.ellipsoid(m.chitinDark, 0.34, 0.15, 0.44, 0, 0.3, -0.04, 10);
  b.dome(m.chitin, ...EL, ...ec, 14);
  b.ellipsoid(m.chitinDark, 0.016, EL[1] + 0.006, EL[2] + 0.006, ...ec, 8);    // elytra seam
  b.ellipsoid(m.team, EL[0] + 0.016, 0.07, EL[2] * 0.88, 0, 0.37, -0.08, 12);   // flank stripe
  band(b, m.team, EL, ec, 0.26, 0.06, 14);
  band(b, m.metal, EL, ec, -0.37, 0.03, 14);
  // pronotum, head, gold shovel clypeus and horn
  b.ellipsoid(m.chitinLight, 0.3, 0.15, 0.17, 0, 0.36, 0.32, 10);
  b.ellipsoid(m.chitin, 0.22, 0.08, 0.15, 0, 0.27, 0.5, 10);
  for (const s of [-1, 1]) {
    b.ellipsoid(m.eye, 0.036, 0.036, 0.036, s * 0.18, 0.29, 0.52, 6);
    b.ellipsoid(m.organ, 0.03, 0.025, 0.03, s * 0.2, 0.42, 0.42, 6);              // firefly headlamps
  }
  b.ellipsoid(m.metal, 0.27, 0.022, 0.1, 0, 0.21, 0.6, 10, 0.2, 0, 0);
  spikes(b, m.metal, [-0.2, 0.19, 0.67], [0.2, 0.19, 0.67], 5, 0.06, 0.018, [0, -0.25, 1]);
  chain(b, m.chitinLight, [[0, 0.33, 0.5, 0.035], [0, 0.42, 0.55, 0.022], [0, 0.48, 0.52, 0.01]], 6);

  // cradle on the back
  const CY = 0.63, CZ = -0.1;
  b.cyl(m.team, 0.25, 0.2, 0.08, 12, 0, CY - 0.04, CZ);                          // team cradle wall
  b.torus(m.metal, 0.26, 0.022, 4, 16, 0, CY, CZ, Math.PI / 2, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.metal, [[c * 0.25, CY, CZ + s * 0.25, 0.018], [c * 0.29, CY + 0.13, CZ + s * 0.29, 0.012], [c * 0.24, CY + 0.22, CZ + s * 0.24, 0.005]], 4, false);
  }
  body.add(b.build());

  // crystalline nutrient cluster (scaled in Y by the load)
  const c = new PartBuilder();
  c.dome(m.resin, 0.24, 0.11, 0.24, 0, 0, 0, 10);
  const xs = [[0, 0.13, 0, 0.08, 0.2, 0, 0], [0.12, 0.08, 0.05, 0.06, 0.14, 0.1, -0.5], [-0.11, 0.08, 0.07, 0.06, 0.15, 0.35, 0.5],
    [0.05, 0.07, -0.13, 0.055, 0.13, -0.5, -0.2], [-0.1, 0.07, -0.1, 0.06, 0.13, -0.4, 0.4], [0.17, 0.04, -0.06, 0.04, 0.09, -0.2, -0.7], [-0.17, 0.04, -0.01, 0.04, 0.09, 0, 0.8]];
  for (const [x, y, z, r, h, rx, rz] of xs) c.octa(m.crystal, r, x, y, z, 1, h / r, 1, rx, 0, rz);
  for (const [x, z] of [[0.06, 0.15], [-0.04, -0.17], [0.17, 0.1]]) c.ico(m.crystal, 0.03, 0, x, 0.07, z);
  body.add(pivot('cargo', c, 0, CY, CZ));

  // tachyon gland on the abdomen tip
  const g = new PartBuilder();
  g.ellipsoid(m.chrono, 0.15, 0.12, 0.09, 0, 0, 0, 10);
  g.torus(m.metal, 0.13, 0.016, 4, 14, 0, 0, 0.03, 0, 0, 0);
  body.add(pivot('pulseGland', g, 0, 0.34, -0.53));

  for (const a of antennae(m.chitinDark, { y: 0.32, z: 0.58, len: 0.14, spread: 0.12, r: 0.009, tipMat: m.metal })) body.add(a);
  for (const l of legs(m.chitinDark, { pairs: 3, x: 0.26, y: 0.27, z0: 0.26, dz: 0.25, reach: 0.36, lift: 0.1, r: 0.032, spread: 0.6, jointMat: m.metal, footMat: m.chitinLight }, (lb, s, i, k, f) => {
    if (i === 0) spikes(lb, m.chitinLight, lerp3(k, f, 0.2), lerp3(k, f, 0.75), 3, 0.05, 0.012, [s, 0.2, 0.5]); // digging teeth
  })) root.add(l);
  return root;
}

/**
 * Horned Stag Rover (Grizzly) — r 0.42, h 0.6. Stag beetle with huge antler mandibles (`mandL/mandR`)
 * and a pneumatic kinetic bone cannon in the `turret` (gold pistons, resin pressure bladder).
 */
export function buildStagRover(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  const EL = [0.27, 0.19, 0.34], ec = [0, 0.27, -0.2];
  b.ellipsoid(m.chitinDark, 0.23, 0.1, 0.38, 0, 0.27, -0.1, 10);
  b.dome(m.chitin, ...EL, ...ec, 14);
  b.ellipsoid(m.chitinDark, 0.014, EL[1] + 0.005, EL[2] + 0.005, ...ec, 8);    // elytra seam
  band(b, m.team, EL, ec, -0.08, 0.05, 14);
  band(b, m.team, EL, ec, -0.2, 0.045, 14);
  band(b, m.metal, EL, ec, 0.3, 0.02, 12);
  b.ellipsoid(m.chitinLight, 0.21, 0.11, 0.13, 0, 0.31, 0.15, 10);             // pronotum
  band(b, m.team, [0.21, 0.11, 0.13], [0, 0.31, 0.15], 0.0, 0.05, 12);
  b.ellipsoid(m.chitin, 0.19, 0.075, 0.12, 0, 0.29, 0.32, 10);                 // broad stag head
  b.ellipsoid(m.team, 0.08, 0.03, 0.06, 0, 0.35, 0.3, 8);                       // team crest
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.032, 0.032, 0.032, s * 0.185, 0.3, 0.34, 6);
  body.add(b.build());

  // antler mandibles: bow outward, then hook inward with a branch tine
  for (const s of [-1, 1]) {
    const mb = new PartBuilder();
    chain(mb, m.chitinLight, [[0, 0, 0, 0.042], [s * 0.08, 0.02, 0.12, 0.036], [s * 0.1, 0.05, 0.26, 0.028], [s * 0.06, 0.07, 0.38, 0.02], [-s * 0.01, 0.075, 0.44, 0.01]], 6, true);
    mb.taper(m.chitinLight, [s * 0.1, 0.05, 0.24], [s * 0.02, 0.07, 0.3], 0.016, 0.003, 4);
    mb.taper(m.metal, [s * 0.075, 0.03, 0.15], [s * 0.02, 0.035, 0.18], 0.012, 0.002, 4);
    body.add(pivot(s < 0 ? 'mandL' : 'mandR', mb, s * 0.1, 0.29, 0.4));
  }

  // pneumatic kinetic bone cannon
  const t = new PartBuilder();
  t.ellipsoid(m.metal, 0.12, 0.055, 0.13, 0, 0, 0, 10);
  t.dome(m.chitinLight, 0.1, 0.075, 0.11, 0, 0.02, -0.02, 10);
  t.taper(m.bone, [0, 0.05, 0.02], [0, 0.06, 0.44], 0.042, 0.03, 8);
  for (const z of [0.16, 0.28, 0.38]) t.cyl(m.metal, 0.046 - z * 0.03, 0.046 - z * 0.03, 0.022, 8, 0, 0.05 + z * 0.024, z, Math.PI / 2, 0, 0, true);
  for (const s of [-1, 1]) {
    t.cyl(m.metal, 0.016, 0.016, 0.24, 6, s * 0.055, 0.035, 0.12, Math.PI / 2, 0, 0);
    t.cyl(m.chitinDark, 0.011, 0.011, 0.1, 5, s * 0.055, 0.035, 0.28, Math.PI / 2, 0, 0);
  }
  t.ellipsoid(m.resin, 0.075, 0.06, 0.08, 0, 0.06, -0.14, 8);                   // pressure bladder
  t.ellipsoid(m.organ, 0.035, 0.03, 0.04, 0, 0.06, -0.14, 6);
  t.cyl(m.team, 0.052, 0.052, 0.04, 10, 0, 0.052, 0.07, Math.PI / 2, 0, 0, true);
  t.cyl(m.chitinDark, 0.04, 0.04, 0.05, 8, 0, 0.06, 0.45, Math.PI / 2, 0, 0);   // muzzle brake
  const turret = pivot('turret', t, 0, 0.46, -0.02);
  turret.add(marker('muzzle', 0, 0.06, 0.49));
  body.add(turret);

  for (const a of antennae(m.chitinDark, { y: 0.31, z: 0.4, len: 0.12, spread: 0.14, r: 0.007, tipMat: m.chitinLight })) body.add(a);
  for (const l of legs(m.chitinDark, { pairs: 3, x: 0.17, y: 0.25, z0: 0.14, dz: 0.21, reach: 0.36, lift: 0.1, r: 0.025, spread: 0.6, jointMat: m.metal, footMat: m.chitin })) root.add(l);
  return root;
}

/**
 * Floral Orchid Mantis (Mirage) — r 0.42, h 0.6. Ambush mantis dressed as a flower: petal-lobed legs and
 * pronotum, fern fronds along a broad leafy abdomen, raptorial forelegs (`armA/armB`) and an incendiary
 * bile gland glowing in its mouth (muzzle).
 */
export function buildOrchidMantis(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // broad leafy abdomen curled up like a blossom: petal midrib, team bands, petal lobes (built level, then tilted)
  const ab = new PartBuilder();
  const AB = [0.16, 0.08, 0.27], ac = [0, 0, -0.22];
  ab.ellipsoid(m.chitinLight, ...AB, ...ac, 10);
  ab.ellipsoid(m.petal, 0.045, AB[1] + 0.006, AB[2] * 0.86, ...ac, 8);
  band(ab, m.team, AB, ac, 0.04, 0.06, 12);
  band(ab, m.team, AB, ac, -0.08, 0.055, 12);
  band(ab, m.team, AB, ac, -0.19, 0.045, 12);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) ab.ellipsoid(m.petal, 0.085 - i * 0.008, 0.012, 0.055, s * 0.165, 0.01 + i * 0.01, -0.08 - i * 0.1, 6, 0, s * 0.35, s * (0.25 + i * 0.1));
    ab.leaf(m.fern, 0.18, 0.1, 3, 0.5, s * 0.1, -0.02, -0.16, s * (Math.PI / 2 + 0.55), 0.25);
  }
  for (let i = 0; i < 5; i++) {                                                   // blossom of petals at the curled tip
    const a = (i / 5) * Math.PI * 2;
    ab.ellipsoid(i % 2 ? m.petal : m.chitinLight, 0.06, 0.012, 0.035, Math.cos(a) * 0.05, 0.02, -0.47 + Math.sin(a) * 0.05, 6, 0, -a, 0.4);
  }
  ab.ellipsoid(m.organ, 0.025, 0.02, 0.025, 0, 0.03, -0.47, 5);
  ab.leaf(m.fernLight, 0.13, 0.08, 3, 0.4, 0, 0, -0.44, Math.PI, -0.2);
  const abd = ab.build();
  abd.position.set(0, 0.33, -0.06);
  abd.rotation.x = 0.32;
  body.add(abd);
  // thorax and rising prothorax with a petal shield
  b.ellipsoid(m.chitin, 0.09, 0.07, 0.12, 0, 0.33, -0.02, 8);
  b.taper(m.chitinLight, [0, 0.35, 0.04], [0, 0.5, 0.22], 0.055, 0.04, 8);
  slab(b, m.petal, [0, 0.39, 0.03], [0, 0.52, 0.21], 0.085, 0.016, 8);
  slab(b, m.team, [0, 0.4, 0.05], [0, 0.52, 0.2], 0.05, 0.02, 6);
  // triangular head, horned eyes, bile mouth
  b.ellipsoid(m.chitinLight, 0.075, 0.045, 0.05, 0, 0.535, 0.25, 8);
  for (const s of [-1, 1]) {
    b.ellipsoid(m.eye, 0.032, 0.036, 0.032, s * 0.068, 0.555, 0.25, 6);
    b.taper(m.eye, [s * 0.072, 0.585, 0.25], [s * 0.08, 0.625, 0.24], 0.013, 0.002, 4);
    b.taper(m.metal, [s * 0.02, 0.495, 0.3], [s * 0.006, 0.475, 0.33], 0.008, 0.002, 4);
  }
  b.taper(m.chitinLight, [0, 0.52, 0.27], [0, 0.49, 0.31], 0.035, 0.02, 6);
  b.ellipsoid(m.fire, 0.02, 0.016, 0.016, 0, 0.485, 0.315, 6);
  b.ellipsoid(m.resin, 0.045, 0.04, 0.06, 0, 0.42, 0.13, 6);                    // bile sac
  b.ellipsoid(m.fire, 0.025, 0.022, 0.035, 0, 0.42, 0.13, 5);
  body.add(b.build());
  body.add(marker('muzzle', 0, 0.485, 0.34));

  // raptorial forelegs, folded
  for (const s of [-1, 1]) {
    const ab = new PartBuilder();
    const c = [s * 0.025, -0.11, 0.03], f = [s * 0.035, -0.05, 0.2], tb = [s * 0.03, -0.14, 0.13];
    ab.taper(m.chitinLight, [0, 0, 0], c, 0.026, 0.02, 6);
    ab.taper(m.team, lerp3([0, 0, 0], c, 0.35), lerp3([0, 0, 0], c, 0.65), 0.027, 0.025, 6);
    ab.ellipsoid(m.chitin, 0.024, 0.024, 0.024, ...c, 5);
    ab.taper(m.chitinLight, c, f, 0.022, 0.016, 6);
    slab(ab, m.petal, lerp3(c, f, 0.15).map((v, j) => (j === 0 ? v + s * 0.02 : v)), lerp3(c, f, 0.85).map((v, j) => (j === 0 ? v + s * 0.02 : v)), 0.025, 0.008, 6);
    spikes(ab, m.metal, lerp3(c, f, 0.2), lerp3(c, f, 0.85), 3, 0.03, 0.006, [0, -1, 0.3]);
    ab.taper(m.chitinLight, f, tb, 0.016, 0.006, 5);
    body.add(pivot(s < 0 ? 'armA' : 'armB', ab, s * 0.05, 0.47, 0.17));
  }
  for (const a of antennae(m.chitinDark, { y: 0.57, z: 0.26, len: 0.16, spread: 0.02, r: 0.005 })) body.add(a);

  // four walking legs with petal-shaped femoral lobes
  for (const l of legs(m.chitinLight, { pairs: 2, x: 0.07, y: 0.31, z0: 0.0, dz: 0.16, reach: 0.46, lift: 0.14, r: 0.018, spread: 1.0, jointMat: m.chitin, footMat: m.chitinDark, jseg: 5 }, (lb, s, i, k) => {
    slab(lb, m.petal, lerp3([0, 0, -0.035], k, 0.15), lerp3([0, 0, -0.035], k, 1.0), 0.06, 0.009, 6);
  })) root.add(l);
  return root;
}

/**
 * Photonic Refraction Weaver (Prism Tank) — r 0.46. Long-legged spider chassis carrying an array of focused
 * convex lenses (gold rims, photon cores, glass caps): a big main lens on the face (muzzle), flanking lenses and
 * a forward-focused secondary array on the abdomen.
 */
export function buildRefractionWeaver(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  // cephalothorax + pedicel + abdomen
  b.ellipsoid(m.chitinDark, 0.15, 0.07, 0.17, 0, 0.43, 0.1, 10);
  b.dome(m.chitin, 0.16, 0.1, 0.18, 0, 0.43, 0.1, 12);
  band(b, m.team, [0.16, 0.1, 0.18], [0, 0.43, 0.1], -0.07, 0.06, 12);
  b.taper(m.chitinDark, [0, 0.45, -0.06], [0, 0.47, -0.13], 0.045, 0.05, 6);
  const AB = [0.22, 0.17, 0.26], ac = [0, 0.5, -0.36];
  b.ellipsoid(m.chitinDark, ...AB, ...ac, 10);
  b.dome(m.chitin, AB[0] * 1.01, AB[1] * 1.01, AB[2] * 1.01, ...ac, 12);
  b.ellipsoid(m.team, AB[0] + 0.012, 0.035, AB[2] * 0.9, ac[0], ac[1] + 0.01, ac[2], 12);  // team girdle
  band(b, m.team, AB, ac, -0.16, 0.05, 12);
  // chelicerae + pedipalps
  for (const s of [-1, 1]) {
    b.taper(m.chitinDark, [s * 0.04, 0.4, 0.24], [s * 0.03, 0.33, 0.29], 0.026, 0.012, 5);
    b.taper(m.metal, [s * 0.03, 0.33, 0.29], [s * 0.015, 0.3, 0.3], 0.01, 0.002, 4);
    chain(b, m.chitinDark, [[s * 0.07, 0.41, 0.24, 0.012], [s * 0.1, 0.38, 0.32, 0.01], [s * 0.08, 0.32, 0.36, 0.007]], 4, false);
  }
  // lens array
  const apex = lens(b, m, [0, 0.46, 0.27], [0, 0.12, 1], 0.095, 12);
  for (const s of [-1, 1]) {
    lens(b, m, [s * 0.115, 0.48, 0.21], [s * 0.6, 0.35, 1], 0.05, 8);
    lens(b, m, [s * 0.06, 0.52, 0.11], [s * 0.2, 1, 0.5], 0.036, 8);
  }
  for (let i = -2; i <= 2; i++) {
    const { p, n } = onShell(AB, ac, i * 0.095, ac[2] + 0.07 - Math.abs(i) * 0.065);
    const dir = [n[0], n[1], n[2] + 0.7];
    lens(b, m, [p[0] - n[0] * 0.012, p[1] - n[1] * 0.012, p[2] - n[2] * 0.012], dir, i === 0 ? 0.072 : 0.056, 8);
  }
  // gold focusing truss linking the abdomen array to the main lens
  b.taper(m.metal, [0, 0.66, -0.3], [0, 0.55, 0.05], 0.014, 0.012, 5);
  body.add(b.build());
  const nd = new THREE.Vector3(0, 0.12, 1).normalize();
  body.add(marker('muzzle', apex[0], apex[1] + nd.y * 0.012, apex[2] + nd.z * 0.012));

  for (const l of legs(m.chitinDark, { pairs: 4, x: 0.11, y: 0.42, z0: 0.19, dz: 0.09, reach: 0.56, lift: 0.24, r: 0.022, spread: 1.5, jointMat: m.metal, footMat: m.chitinLight }, (lb, s, i, k, f) => {
    lb.taper(m.team, lerp3(k, f, 0.07), lerp3(k, f, 0.26), 0.025, 0.023, 5);
  })) root.add(l);
  return root;
}

/**
 * Tiger-Beetle Ballista (Tank Destroyer) — low-slung, ultra-armoured beetle with sloped side skirts,
 * tiger maculae in team colour and an oversized armour-piercing ram horn on a pneumatic housing.
 * No turret; muzzle at the horn tip.
 */
export function buildTigerBallista(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  const SH = [0.31, 0.16, 0.42], sc = [0, 0.2, -0.14];
  b.ellipsoid(m.chitinDark, 0.27, 0.085, 0.42, 0, 0.2, -0.1, 10);
  b.dome(m.chitin, ...SH, ...sc, 14);
  b.ellipsoid(m.chitinDark, 0.014, SH[1] + 0.005, SH[2] + 0.005, ...sc, 8);    // elytra seam
  band(b, m.metal, SH, sc, 0.3, 0.025, 14);
  // tiger maculae
  for (const [x, z, mt, r] of [[0.14, -0.02, m.team, 0.065], [0.19, -0.21, m.team, 0.065], [0.09, -0.38, m.team, 0.06], [0.23, -0.07, m.metal, 0.03], [0.06, -0.19, m.metal, 0.032], [0.18, -0.4, m.metal, 0.028]]) {
    for (const s of [-1, 1]) {
      const { p, n } = onShell(SH, sc, s * x, z);
      b.ellipsoid(mt, r, 0.014, r * 1.15, p[0] - n[0] * 0.004, p[1] - n[1] * 0.004, p[2], 6, ...aim(AXIS_Y, n));
    }
  }
  // sloped armour skirts with gold edges
  for (const s of [-1, 1]) {
    b.box(m.chitinLight, 0.035, 0.11, 0.62, s * 0.305, 0.2, -0.12, 0, 0, s * 0.35);
    b.box(m.team, 0.045, 0.03, 0.64, s * 0.285, 0.258, -0.12, 0, 0, s * 0.35);
    b.box(m.metal, 0.03, 0.012, 0.66, s * 0.278, 0.276, -0.12, 0, 0, s * 0.35);
  }
  // pronotum, armoured head, bulging eyes
  b.ellipsoid(m.chitinLight, 0.22, 0.1, 0.14, 0, 0.24, 0.26, 10);
  b.ellipsoid(m.chitin, 0.2, 0.08, 0.13, 0, 0.22, 0.4, 10);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.05, 0.05, 0.05, s * 0.17, 0.27, 0.42, 6);
  // pneumatic ram housing + oversized horn
  b.cyl(m.metal, 0.075, 0.085, 0.3, 8, 0, 0.33, 0.2, Math.PI / 2, 0, 0);
  b.cyl(m.team, 0.089, 0.089, 0.07, 8, 0, 0.33, 0.12, Math.PI / 2, 0, 0, true);
  b.dome(m.chitinLight, 0.1, 0.065, 0.17, 0, 0.35, 0.15, 8);
  const H0 = [0, 0.33, 0.33], H1 = [0, 0.31, 0.86];
  b.taper(m.bone, H0, H1, 0.068, 0.014, 8);
  for (const t of [0.12, 0.38, 0.62]) {
    const p = lerp3(H0, H1, t), r = 0.068 + (0.014 - 0.068) * t + 0.008;
    b.cyl(m.metal, r, r, 0.03, 8, ...p, Math.PI / 2, 0, 0, true);
  }
  b.cone(m.metal, 0.02, 0.08, 6, 0, 0.31, 0.9, Math.PI / 2, 0, 0);
  // firefly exhaust glands
  for (const s of [-1, 1]) b.ellipsoid(m.organ, 0.035, 0.03, 0.03, s * 0.12, 0.24, -0.55, 6);
  body.add(b.build());
  body.add(marker('muzzle', 0, 0.31, 0.95));

  for (const a of mandibles(m.chitinLight, { x: 0.1, y: 0.18, z: 0.5, len: 0.16, r: 0.022, curve: 1.0, teethMat: m.metal })) body.add(a);
  for (const a of antennae(m.chitinDark, { y: 0.27, z: 0.48, len: 0.16, spread: 0.1, r: 0.007, curve: 0.2 })) body.add(a);
  for (const l of legs(m.chitinDark, { pairs: 3, x: 0.2, y: 0.18, z0: 0.12, dz: 0.21, reach: 0.38, lift: 0.12, r: 0.024, spread: 0.7, jointMat: m.metal, footMat: m.chitinLight })) root.add(l);
  return root;
}

/**
 * Brood Mother Carapace (MCV) — r 0.7, h 1.0. Enormous queen crawler: layered dorsal plates with team / gold
 * rims, a budding spire cyst on the back (deploys into the Maternal Spire), a translucent amber egg-sac
 * abdomen full of glowing eggs, ten lumbering legs.
 */
export function buildBroodMother(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  b.ellipsoid(m.chitinDark, 0.46, 0.2, 0.78, 0, 0.42, -0.05, 12);
  // layered dorsal plates (front → back)
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), k = 1 - Math.abs(t - 0.4) * 0.3;
    const R = [0.5 * k, 0.34 * k, 0.23], c = [0, 0.42, 0.5 - t * 1.05];
    b.dome(i === 0 ? m.chitinLight : m.chitin, ...R, ...c, 12);
    band(b, i === 0 ? m.metal : m.team, R, c, -0.075, 0.055, 12, 1.03);
  }
  // budding spire cyst with glowing veins and a gold crown
  const BY = 0.84, BZ = 0.06;
  b.dome(m.chitinDark, 0.26, 0.08, 0.26, 0, 0.72, BZ, 10);                      // cradle cup
  b.torus(m.metal, 0.25, 0.022, 4, 16, 0, 0.74, BZ, Math.PI / 2, 0, 0);
  b.ellipsoid(m.chitin, 0.2, 0.23, 0.2, 0, BY, BZ, 10);
  b.torus(m.team, 0.19, 0.028, 4, 14, 0, BY + 0.06, BZ, Math.PI / 2, 0, 0);
  b.torus(m.chitinLight, 0.2, 0.02, 4, 14, 0, BY - 0.06, BZ, Math.PI / 2, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.organ, [c * 0.18, BY - 0.1, BZ + s * 0.18], [c * 0.11, BY + 0.16, BZ + s * 0.11], 0.018, 0.01, 4);
    b.taper(m.metal, [c * 0.07, BY + 0.2, BZ + s * 0.07], [c * 0.14, BY + 0.31, BZ + s * 0.14], 0.026, 0.003, 4);
  }
  b.taper(m.chitinLight, [0, BY + 0.18, BZ], [0, BY + 0.32, BZ], 0.07, 0.005, 6);
  // queen head with diadem
  b.ellipsoid(m.chitinLight, 0.28, 0.17, 0.2, 0, 0.44, 0.75, 10);
  b.ellipsoid(m.chitin, 0.2, 0.12, 0.13, 0, 0.4, 0.88, 10);
  b.ellipsoid(m.team, 0.13, 0.05, 0.12, 0, 0.57, 0.74, 8);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.055, 0.055, 0.055, s * 0.2, 0.48, 0.84, 8);
  spikes(b, m.metal, [-0.12, 0.6, 0.7], [0.12, 0.6, 0.7], 3, 0.07, 0.016, [0, 1, 0.3]);
  // gold collar where the egg sac joins
  b.torus(m.metal, 0.3, 0.03, 4, 16, 0, 0.46, -0.6, 0, 0, 0);
  body.add(b.build());

  // translucent egg sac full of glowing eggs (slow pulse)
  const sac = new PartBuilder();
  sac.ellipsoid(m.resin, 0.4, 0.32, 0.36, 0, 0, 0, 12);
  sacs(sac, m.organ, 0, -0.1, 0, 8, 0.075, 0.22, 11);
  body.add(pivot('pulseSac', sac, 0, 0.47, -0.9));

  for (const a of mandibles(m.chitinDark, { x: 0.12, y: 0.36, z: 0.96, len: 0.2, r: 0.035, curve: 0.9, teethMat: m.metal })) body.add(a);
  for (const a of antennae(m.chitinDark, { y: 0.54, z: 0.88, len: 0.3, spread: 0.1, r: 0.014, tipMat: m.organ })) body.add(a);
  for (const l of legs(m.chitinDark, { pairs: 5, x: 0.36, y: 0.38, z0: 0.5, dz: 0.25, reach: 0.5, lift: 0.18, r: 0.045, spread: 0.8, jointMat: m.metal, footMat: m.chitinLight })) root.add(l);
  return root;
}

/**
 * Water Boatman Skimmer (Amphibious Transport) — r 0.5. Boat-hulled Corixidae bug with an open carrying
 * cavity on its back (gold-rimmed hatch, seat lights, raised elytron lid) and long fringed oar legs.
 */
export function buildWaterBoatman(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();

  const HU = [0.32, 0.17, 0.56], hc = [0, 0.32, -0.08];
  b.ellipsoid(m.chitinDark, 0.29, 0.13, 0.55, 0, 0.31, -0.06, 12);
  b.dome(m.chitin, ...HU, ...hc, 14);
  b.ellipsoid(m.team, HU[0] + 0.016, 0.05, HU[2] * 0.88, 0, 0.36, -0.08, 12);      // flank stripe
  for (const dz of [-0.3, -0.36, -0.42]) band(b, m.chitinDark, HU, hc, dz, 0.014, 12, 1.02);
  // open hatch: coaming, dark cavity, gold rim, seat lights
  const CZ = -0.02;
  b.add(m.team, new THREE.CylinderGeometry(1, 1, 0.07, 14), [0, 0.465, CZ], [0, 0, 0], [0.2, 1, 0.29]);
  b.add(m.dark, new THREE.CylinderGeometry(1, 1, 0.02, 14), [0, 0.497, CZ], [0, 0, 0], [0.165, 1, 0.25]);
  b.add(m.metal, new THREE.TorusGeometry(1, 0.08, 3, 16), [0, 0.5, CZ], [Math.PI / 2, 0, 0], [0.2, 0.29, 0.25]);
  for (const [x, z] of [[-0.08, 0.12], [0.08, 0.12], [-0.08, 0.0], [0.08, 0.0], [-0.08, -0.12], [0.08, -0.12]]) b.ellipsoid(m.organ, 0.018, 0.01, 0.018, x, 0.507, CZ + z, 5);
  // raised elytron lid hinged behind the hatch
  const HZ = CZ - 0.27, LA = 0.7, LR = 0.25;
  const lc = [0, 0.5 + Math.sin(LA) * LR, HZ + Math.cos(LA) * LR];
  b.dome(m.chitinLight, 0.19, 0.05, LR, ...lc, 10, -LA, 0, 0);
  b.ellipsoid(m.chitinDark, 0.19, 0.008, LR, ...lc, 8, -LA, 0, 0);
  b.dome(m.team, 0.1, 0.054, LR * 0.95, ...lc, 8, -LA, 0, 0);
  for (const s of [-1, 1]) b.ellipsoid(m.metal, 0.025, 0.025, 0.04, s * 0.12, 0.5, HZ, 6);  // hinges
  // blunt head, big eyes, rostrum
  b.ellipsoid(m.chitinLight, 0.22, 0.13, 0.15, 0, 0.33, 0.46, 10);
  b.ellipsoid(m.team, 0.1, 0.03, 0.06, 0, 0.45, 0.43, 8);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.06, 0.07, 0.07, s * 0.17, 0.37, 0.5, 6);
  b.taper(m.chitinDark, [0, 0.27, 0.58], [0, 0.2, 0.64], 0.04, 0.015, 5);
  body.add(b.build());

  // short scoop forelegs, long middle walking legs, fringed oar hind legs
  for (const l of legs(m.chitinDark, { pairs: 1, x: 0.16, y: 0.26, z0: 0.42, reach: 0.26, lift: 0.08, r: 0.02, footMat: m.chitinLight, i0: 0 }, (lb, s, i, k, f) => {
    slab(lb, m.chitinLight, k, lerp3(k, f, 1.08), 0.03, 0.01, 5);
  })) root.add(l);
  for (const l of legs(m.chitinDark, { pairs: 1, x: 0.22, y: 0.28, z0: 0.12, reach: 0.48, lift: 0.18, r: 0.024, jointMat: m.metal, footMat: m.chitinLight, i0: 1 })) root.add(l);
  for (const s of [-1, 1]) {
    const knee = [s * 0.27, 0.12, -0.07], foot = [s * 0.67, -0.285, -0.3];
    root.add(limb(`hex${legGroup(2, s)}2${s < 0 ? 'L' : 'R'}`, m.chitinDark, [s * 0.24, 0.3, -0.22], [[0, 0, 0, 0.035], [...knee, 0.028], [...foot, 0.012]], m.metal, 5, 6, (lb) => {
      slab(lb, m.chitinLight, lerp3(knee, foot, 0.12), lerp3(knee, foot, 1.04), 0.065, 0.014, 8);  // oar blade
      slab(lb, m.team, lerp3(knee, foot, 0.4), lerp3(knee, foot, 0.62), 0.069, 0.017, 6);
      for (let j = 0; j < 5; j++) {
        const p = lerp3(knee, foot, 0.3 + j * 0.15);
        lb.taper(m.metal, p, [p[0] + s * 0.01, p[1] + 0.005, p[2] - 0.085], 0.005, 0.001, 3);   // swimming hairs
      }
    }));
  }
  return root;
}

/**
 * Colossal Millipede Dreadnought (Battle Fortress) — r 0.75, h 0.9. Nine armoured ring segments with team / gold
 * plate rims and spines, team-armoured firing embrasures on the plates, dozens of legs (12 animated, the rest
 * static), elbowed antennae and mandibles.
 */
export function buildMillipedeDreadnought(team) {
  const m = mats(team, F);
  const [root, body] = unitRoot();
  const b = new PartBuilder();
  const st = new PartBuilder();                                                 // static legs (on the root)
  const N = 9, Z0 = 0.85, DZ = 0.215, Y = 0.4;
  const zs = [];
  for (let i = 0; i < N; i++) {
    const z = Z0 - i * DZ;
    zs.push(z);
    const k = i === 0 ? 0.88 : i === N - 1 ? 0.7 : i === N - 2 ? 0.88 : 1;
    b.ellipsoid(m.chitinDark, 0.27 * k, 0.24 * k, 0.14, 0, Y, z, 8);
    const R = [0.34 * k, 0.33 * k, 0.15], c = [0, Y, z - 0.03];
    b.dome(i % 2 ? m.chitin : m.chitinLight, ...R, ...c, 10);
    band(b, i % 2 ? m.team : m.metal, R, c, -0.075, 0.035, 10, 1.03);           // trailing plate rim
    if (i > 0 && i < N - 1) {
      b.cone(m.chitinLight, 0.04, 0.15, 5, 0, Y + R[1] + 0.06, c[2] - 0.02, -0.35, 0, 0);
      b.cone(m.metal, 0.018, 0.05, 5, 0, Y + R[1] + 0.135, c[2] - 0.05, -0.35, 0, 0);
    }
    // armoured firing embrasures (garrison slots) on segments 2..6
    if (i >= 2 && i <= 6) {
      for (const s of [-1, 1]) {
        const { p, n } = onShell(R, c, s * 0.22, c[2]);
        const th = -Math.atan2(n[0], n[1]);
        const o = [p[0] + n[0] * 0.02, p[1] + n[1] * 0.02, p[2]];
        const ox = [Math.cos(th), Math.sin(th)];
        b.box(m.team, 0.1, 0.07, 0.13, ...o, 0, 0, th);
        b.box(m.metal, 0.012, 0.04, 0.105, o[0] + ox[0] * 0.047, o[1] + ox[1] * 0.047, o[2], 0, 0, th);
        b.box(m.dark, 0.012, 0.022, 0.085, o[0] + ox[0] * 0.052, o[1] + ox[1] * 0.052, o[2], 0, 0, th);
      }
    }
  }
  // head
  const hz = Z0 + 0.2;
  b.ellipsoid(m.chitinLight, 0.24, 0.19, 0.17, 0, Y - 0.02, hz, 10);
  b.ellipsoid(m.team, 0.09, 0.05, 0.1, 0, Y + 0.14, hz - 0.02, 6);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.045, 0.045, 0.045, s * 0.15, Y + 0.05, hz + 0.1, 6);
  // telson with gold anal spines
  const tz = zs[N - 1] - 0.15;
  b.ellipsoid(m.chitinDark, 0.13, 0.11, 0.12, 0, Y - 0.04, tz, 8);
  for (const s of [-1, 1]) b.taper(m.metal, [s * 0.06, Y - 0.04, tz - 0.06], [s * 0.1, Y - 0.06, tz - 0.2], 0.03, 0.004, 5);
  body.add(b.build());
  for (const a of mandibles(m.chitinDark, { x: 0.08, y: Y - 0.1, z: hz + 0.13, len: 0.12, r: 0.025, curve: 0.9, teethMat: m.metal })) body.add(a);
  for (const a of antennae(m.chitinDark, { y: Y + 0.08, z: hz + 0.12, len: 0.3, spread: 0.08, r: 0.012, curve: 0.3, tipMat: m.organ })) body.add(a);

  // legs: two pairs per segment; the front pair of segments 1..6 walks, the rest are static
  const LX = 0.2, LY = 0.3, REACH = 0.36, LIFT = 0.1;
  for (let i = 1; i < N - 1; i++) {
    if (i <= 6) {
      for (const l of legs(m.chitinDark, { pairs: 1, x: LX, y: LY, z0: zs[i] + 0.05, reach: REACH, lift: LIFT, r: 0.026, jointMat: m.metal, seg: 4, jseg: 5, i0: i - 1 })) root.add(l);
    } else {
      for (const s of [-1, 1]) {
        const hip = [s * LX, LY, zs[i] + 0.05], knee = [s * (LX + REACH * 0.5), LY + LIFT, zs[i] + 0.05], foot = [s * (LX + REACH), 0.015, zs[i] + 0.05];
        st.taper(m.chitinDark, hip, knee, 0.032, 0.026, 4);
        st.taper(m.chitinDark, knee, foot, 0.026, 0.01, 4);
      }
    }
    for (const s of [-1, 1]) {
      const z = zs[i] - 0.06;
      const hip = [s * LX, LY, z], knee = [s * (LX + REACH * 0.48), LY + LIFT * 0.8, z - 0.02], foot = [s * (LX + REACH * 0.95), 0.015, z - 0.04];
      st.taper(m.chitinDark, hip, knee, 0.03, 0.024, 4);
      st.taper(m.chitinDark, knee, foot, 0.024, 0.009, 4);
    }
  }
  root.add(st.build());
  return root;
}

export const MODELS = {
  scarabHarvester: buildScarabHarvester,
  stagRover: buildStagRover,
  orchidMantis: buildOrchidMantis,
  refractionWeaver: buildRefractionWeaver,
  tigerBallista: buildTigerBallista,
  broodMother: buildBroodMother,
  waterBoatman: buildWaterBoatman,
  millipedeDreadnought: buildMillipedeDreadnought,
};
