// YURI vehicles — bio-mechanical psionic beasts: violet chitin, pink brain-flesh, bone cages,
// translucent violet membranes, fungal growths and glowing psychic organs.
// Walkers: legs on the root, hull (and turret) in `body`.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, eyes, chain, spikes, ribs, plates, hexLegs, arms, antennae } from '../insectKit.js';

const F = 'yuri';
const PI = Math.PI;

// ------------------------------------------------------------------ local helpers

const _UP = new THREE.Vector3(0, 1, 0);
const _ZA = new THREE.Vector3(0, 0, 1);

/** Euler (XYZ) rotating `axis` onto `dir`. */
function eulerTo(dir, axis = _UP) {
  const q = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}

/** Elliptical torus in its local XY plane (radii rx, ry) with an absolute tube radius. */
function etorus(b, mat, rx, ry, tube, pos, rot = [0, 0, 0], arc = PI * 2, rs = 4, ts = 12) {
  const k = (rx + ry) / 2;
  b.add(mat, new THREE.TorusGeometry(1, tube / k, rs, ts, arc), pos, rot, [rx, ry, k]);
}

/** Horizontal elliptical band (belts, collars, rims). */
function hring(b, mat, rx, rz, tube, x, y, z, ts = 14, rs = 4) {
  etorus(b, mat, rx, rz, tube, [x, y, z], [PI / 2, 0, 0], PI * 2, rs, ts);
}

/** Ring whose axis follows `dir` (coils, bands on limbs). */
function ringAt(b, mat, r, tube, p, dir, ts = 10) {
  const e = eulerTo(dir, _ZA);
  b.torus(mat, r, tube, 4, ts, p[0], p[1], p[2], e[0], e[1], e[2]);
}

/** Ellipsoid stretched between points a and c. */
function bulge(b, mat, a, c, r, k = 1, seg = 7) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c);
  const d = C.clone().sub(A);
  const len = d.length();
  const e = eulerTo([d.x, d.y, d.z]);
  const mid = A.add(C).multiplyScalar(0.5);
  b.ellipsoid(mat, r, len * 0.5 * k, r, mid.x, mid.y, mid.z, seg, e[0], e[1], e[2]);
}

/** Ellipsoid with its local X along xAxis and Y along (orthogonalised) yAxis — petals, plates. */
function orientEllipsoid(b, mat, c, xAxis, yAxis, rx, ry, rz, seg = 8) {
  const X = new THREE.Vector3(...xAxis).normalize();
  const Y = new THREE.Vector3(...yAxis);
  Y.sub(X.clone().multiplyScalar(Y.dot(X))).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const e = new THREE.Euler().setFromQuaternion(q);
  b.ellipsoid(mat, rx, ry, rz, c[0], c[1], c[2], seg, e.x, e.y, e.z);
}

/** Two hemispheres with raised gyri arcs and a glowing fissure. rx = half-width of the whole brain. */
function brain(b, lobe, ridge, fissure, cx, cy, cz, rx, ry, rz, o = {}) {
  const { seg = 10, arcs = 3, ts = 8, tube = 0.01, fseg = 8 } = o;
  const hr = rx * 0.54;
  for (const s of [-1, 1]) {
    const hx = cx + s * rx * 0.47;
    b.ellipsoid(lobe, hr, ry, rz, hx, cy, cz, seg);
    for (let i = 0; i < arcs; i++) { // sagittal gyri
      const u = arcs === 1 ? 0 : (i / (arcs - 1) - 0.5) * 1.1;
      const k = Math.sqrt(1 - u * u * 0.8) * 1.03;
      etorus(b, ridge, rz * k, ry * k, tube, [hx + u * hr * 0.8, cy, cz], [0, PI / 2, 0], PI, 3, ts);
    }
    const nc = Math.max(1, arcs - 1);
    for (let i = 0; i < nc; i++) { // coronal gyri
      const v = nc === 1 ? 0 : (i / (nc - 1) - 0.5) * 0.9;
      const k = Math.sqrt(1 - v * v) * 1.03;
      etorus(b, ridge, hr * k, ry * k, tube, [hx, cy, cz + v * rz], [0, 0, 0], PI, 3, ts);
    }
  }
  b.ellipsoid(fissure, rx * 0.1, ry * 0.86, rz * 0.9, cx, cy + ry * 0.06, cz, fseg);
}

/** Cordyceps club: fleshy stalk with a glowing fruiting tip. */
function cordyceps(b, m, base, top, r = 0.016) {
  b.taper(m.flesh, base, top, r, r * 0.7, 5);
  b.ellipsoid(m.organ, r * 1.5, r * 2.6, r * 1.5, ...top, 5);
}

function rigRoot() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  return { root, body };
}

// ------------------------------------------------------------------ models

/**
 * Brood Queen Harvester (Slave Miner) — r 0.7, h 1.0. Lumbering queen crawler with a bloated egg abdomen.
 * deployOn = five root-legs dug into the soil + the opened drone bay; deployOffHatch = the closed bay lid.
 */
export function buildBroodQueen(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // armoured thorax
  b.ellipsoid(m.chitinDark, 0.34, 0.2, 0.36, 0, 0.44, 0.3, 8);
  b.dome(m.chitin, 0.38, 0.24, 0.36, 0, 0.47, 0.3, 12);
  hring(b, m.team, 0.375, 0.355, 0.032, 0, 0.48, 0.3, 16, 3);
  b.box(m.chitinDark, 0.025, 0.02, 0.5, 0, 0.705, 0.3);
  for (const s of [-1, 1]) { // cordyceps growths on the shoulders
    cordyceps(b, m, [s * 0.24, 0.63, 0.2], [s * 0.3, 0.8, 0.17], 0.018);
    cordyceps(b, m, [s * 0.3, 0.58, 0.34], [s * 0.39, 0.71, 0.36], 0.014);
  }

  // head with a bone crown
  b.ellipsoid(m.chitinDark, 0.18, 0.14, 0.15, 0, 0.45, 0.68, 10);
  hring(b, m.team, 0.13, 0.11, 0.022, 0, 0.55, 0.68, 10, 3);
  spikes(b, m.bone, [-0.13, 0.55, 0.64], [0.13, 0.55, 0.64], 5, 0.14, 0.022, [0, 1, 0.25]);
  for (const s of [-1, 1]) {
    b.ellipsoid(m.eye, 0.045, 0.045, 0.045, s * 0.1, 0.5, 0.78, 6);
    b.ellipsoid(m.eye, 0.022, 0.022, 0.022, s * 0.06, 0.56, 0.76, 5);
    chain(b, m.bone, [[s * 0.08, 0.38, 0.78, 0.03], [s * 0.1, 0.33, 0.88, 0.022], [s * 0.05, 0.3, 0.95, 0.01]], 5, false);
  }

  // bloated egg-laden abdomen
  b.ellipsoid(m.flesh, 0.5, 0.42, 0.62, 0, 0.56, -0.4, 12);
  const ab = (z) => Math.sqrt(Math.max(0, 1 - ((z + 0.4) / 0.62) ** 2));
  for (const [z, mat, t, gap] of [[0.02, m.chitinDark, 0.03, 0], [-0.18, m.team, 0.045, 1.5], [-0.66, m.team, 0.045, 1.5], [-0.86, m.chitinDark, 0.03, 0]]) {
    const k = ab(z) * 1.01;
    if (gap) etorus(b, mat, 0.5 * k, 0.42 * k, t, [0, 0.56, z], [0, 0, PI / 2 + gap / 2], PI * 2 - gap, 3, 12);
    else etorus(b, mat, 0.5 * k, 0.42 * k, t, [0, 0.56, z], [0, 0, 0], PI * 2, 3, 12);
  }
  b.dome(m.chitin, 0.3, 0.07, 0.11, 0, 0.84, -0.8, 8, -0.5, 0, 0);
  b.dome(m.chitin, 0.36, 0.07, 0.1, 0, 0.9, -0.02, 8, 0.4, 0, 0);
  for (const s of [-1, 1]) { // translucent egg sacs along the flanks
    for (const z of [-0.16, -0.42, -0.68]) {
      const x = s * (0.5 * 0.925 * ab(z) + 0.02);
      b.ellipsoid(m.membrane, 0.095, 0.1, 0.095, x, 0.4, z, 6);
      b.ellipsoid(m.organ, 0.048, 0.055, 0.048, x, 0.4, z, 4);
    }
    chain(b, m.organ, [[s * 0.4, 0.78, -0.1, 0.012], [s * 0.47, 0.64, -0.3, 0.012], [s * 0.46, 0.66, -0.55, 0.01], [s * 0.36, 0.78, -0.78, 0.008]], 4, false); // psychic veins
  }
  b.taper(m.chitinDark, [0, 0.42, -0.95], [0, 0.28, -1.1], 0.09, 0.03, 8);       // ovipositor
  hring(b, m.bone, 0.27, 0.29, 0.035, 0, 0.94, -0.42, 16, 3);                      // bay rim
  body.add(b.build());
  for (const a of antennae(m.chitinDark, { y: 0.55, z: 0.75, len: 0.32, spread: 0.07, r: 0.012, tipMat: m.organ })) body.add(a);

  // closed bay lid (shrinks away when deployed)
  const hatch = new PartBuilder();
  hatch.dome(m.chitinLight, 0.25, 0.1, 0.27, 0, 0, 0, 10);
  for (let i = 0; i < 5; i++) etorus(hatch, m.chitinDark, 0.26, 0.1, 0.01, [0, 0.002, 0], [0, (i / 5) * PI * 2, 0], PI / 2, 3, 4);
  hring(hatch, m.team, 0.215, 0.235, 0.02, 0, 0.05, 0, 10, 3);
  hatch.ellipsoid(m.organ, 0.04, 0.025, 0.04, 0, 0.095, 0, 6);
  body.add(pivot('deployOffHatch', hatch, 0, 0.94, -0.42));

  // opened drone bay: petals folded back, glowing eggs and hatching drones
  const bay = new PartBuilder();
  bay.ellipsoid(m.chitinDark, 0.24, 0.03, 0.26, 0, 0.035, 0, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + PI / 5;
    const u = [Math.sin(a), 0, Math.cos(a)];
    const base = [u[0] * 0.24, 0.0, u[2] * 0.26], tip = [u[0] * 0.42, 0.2, u[2] * 0.44];
    const axis = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]];
    const len = Math.hypot(...axis);
    const mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2];
    const tan = [u[2], 0, -u[0]];
    const n = new THREE.Vector3(...tan).cross(new THREE.Vector3(...axis)).normalize();
    if (n.y < 0) n.negate();
    orientEllipsoid(bay, m.chitinLight, mid, tan, axis, 0.11, len * 0.55, 0.022, 7);
    orientEllipsoid(bay, m.team, [mid[0] + n.x * 0.016, mid[1] + n.y * 0.016, mid[2] + n.z * 0.016], tan, axis, 0.035, len * 0.48, 0.012, 5);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const p = [Math.sin(a) * 0.13, 0.085, Math.cos(a) * 0.14];
    bay.ellipsoid(m.resin, 0.06, 0.08, 0.06, ...p, 6);
    bay.ellipsoid(m.organ, 0.026, 0.032, 0.026, ...p, 4);
  }
  bay.ellipsoid(m.psy, 0.06, 0.05, 0.06, 0, 0.07, 0, 6);
  bay.ellipsoid(m.chitinLight, 0.03, 0.028, 0.034, 0.0, 0.15, 0.02, 6); // drone crawling out
  for (const s of [-1, 1]) bay.ellipsoid(m.eye, 0.008, 0.008, 0.008, s * 0.012, 0.16, 0.048, 4);
  body.add(pivot('deployOnBay', bay, 0, 0.95, -0.42));

  // five stabilising root-legs dug into the ground (deployed only)
  const rt = new PartBuilder();
  for (let i = 0; i < 5; i++) {
    const th = PI + (i * 2 * PI) / 5;
    const u = [Math.sin(th), Math.cos(th)];
    const at = (r, y) => [u[0] * r, y, -0.1 + u[1] * r];
    const S = at(0.3, 0.42), K = at(0.76, 0.66), Fp = at(1.02, 0.03);
    rt.taper(m.chitinDark, S, K, 0.075, 0.062, 6);
    rt.ellipsoid(m.bone, 0.08, 0.08, 0.08, ...K, 6);
    rt.taper(m.chitinDark, K, Fp, 0.062, 0.035, 6);
    ringAt(rt, m.team, 0.06, 0.02, at(0.88, 0.36), [Fp[0] - K[0], Fp[1] - K[1], Fp[2] - K[2]], 8);
    spikes(rt, m.bone, at(0.6, 0.6), at(0.6, 0.6), 1, 0.08, 0.018, [u[0] * 0.3, 1, u[1] * 0.3]);
    rt.dome(m.mud, 0.15, 0.06, 0.15, Fp[0], 0, Fp[2], 6);
    for (const d of [-0.6, 0.6]) {
      const v = [Math.sin(th + d), Math.cos(th + d)];
      rt.taper(m.bone, [Fp[0], 0.03, Fp[2]], [Fp[0] + v[0] * 0.2, 0.006, Fp[2] + v[1] * 0.2], 0.022, 0.004, 4);
    }
  }
  root.add(pivot('deployOn', rt));

  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.3, y: 0.38, z0: 0.42, dz: 0.38, reach: 0.6, lift: 0.2, r: 0.048, jointMat: m.chitinLight, footMat: m.bone, spread: 0.6 })) root.add(l);
  return root;
}

/** Scythe-Arm Mantis Rover (Lasher Tank) — agile mantis with reinforced talons and a focused energy projector. */
export function buildMantisRover(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // abdomen with folded tegmina
  b.ellipsoid(m.chitin, 0.12, 0.09, 0.3, 0, 0.34, -0.4, 10, 0.1, 0, 0);
  const ax = [0, -Math.sin(0.1), Math.cos(0.1)];
  for (const [t, mat] of [[0.15, m.chitinDark], [0.05, m.team], [-0.06, m.chitinDark], [-0.16, m.team]]) {
    const k = Math.sqrt(1 - (t / 0.3) ** 2) * 1.02;
    etorus(b, mat, 0.12 * k, 0.09 * k, t === 0.05 || t === -0.16 ? 0.02 : 0.013, [0, 0.34 + ax[1] * t, -0.4 + ax[2] * t], [0.1, 0, 0], PI * 2, 4, 12);
  }
  for (const s of [-1, 1]) {
    b.ellipsoid(m.chitinLight, 0.06, 0.014, 0.25, s * 0.045, 0.44, -0.36, 8, 0.1, s * 0.06, 0);
    b.ellipsoid(m.team, 0.012, 0.016, 0.2, s * 0.095, 0.428, -0.36, 5, 0.1, s * 0.06, 0);
    b.polygon(m.membrane, [[0, 0.45, -0.15], [s * 0.12, 0.44, -0.3], [s * 0.1, 0.42, -0.62], [s * 0.03, 0.43, -0.7], [0, 0.44, -0.66]]);
    b.taper(m.chitinDark, [s * 0.03, 0.37, -0.68], [s * 0.06, 0.4, -0.76], 0.012, 0.003, 4); // cerci
  }

  // thorax & raised prothorax
  b.ellipsoid(m.chitin, 0.09, 0.085, 0.16, 0, 0.31, -0.03, 9);
  b.taper(m.chitin, [0, 0.33, 0.08], [0, 0.47, 0.31], 0.055, 0.04, 7);
  orientEllipsoid(b, m.team, [0, 0.438, 0.172], [1, 0, 0], [0, 0.14, 0.23], 0.05, 0.11, 0.02, 7);
  spikes(b, m.chitinLight, [0, 0.39, 0.09], [0, 0.48, 0.26], 3, 0.03, 0.008, [0, 1, -0.4]);

  // triangular head, compound eyes and the energy projector on the brow
  b.ellipsoid(m.chitinLight, 0.085, 0.055, 0.05, 0, 0.52, 0.36, 9);
  b.taper(m.chitinDark, [0, 0.49, 0.38], [0, 0.44, 0.41], 0.035, 0.012, 6);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.034, 0.042, 0.034, s * 0.08, 0.535, 0.36, 8);
  b.cyl(m.metal, 0.026, 0.032, 0.1, 8, 0, 0.585, 0.37, PI / 2, 0, 0);
  b.torus(m.organ, 0.034, 0.008, 4, 10, 0, 0.585, 0.345);
  b.torus(m.team, 0.032, 0.008, 4, 10, 0, 0.585, 0.395);
  b.ellipsoid(m.psy, 0.024, 0.024, 0.018, 0, 0.585, 0.425, 8);
  b.ellipsoid(m.organ, 0.03, 0.026, 0.03, 0, 0.57, 0.305, 6);
  body.add(b.build());
  for (const a of antennae(m.chitinDark, { y: 0.565, z: 0.34, len: 0.22, spread: 0.035, r: 0.006 })) body.add(a);

  // reinforced raptorial scythe-arms
  for (const a of arms(m.chitin, { x: 0.075, y: 0.42, z: 0.24, len: 0.3, r: 0.024, jointMat: m.chitinLight }, (ab, s, h) => {
    const el = [s * 0.02, -0.135, 0.06];
    bulge(ab, m.metal, el, h, 0.03, 0.75, 6);
    ringAt(ab, m.team, 0.028, 0.009, [(el[0] + h[0]) / 2, (el[1] + h[1]) / 2, (el[2] + h[2]) / 2], [h[0] - el[0], h[1] - el[1], h[2] - el[2]], 8);
    spikes(ab, m.bone, [s * 0.008, -0.04, 0.02], [s * 0.018, -0.115, 0.05], 3, 0.035, 0.008, [-s * 0.3, -0.2, 1]);
    chain(ab, m.bone, [[h[0], h[1], h[2], 0.02], [h[0], h[1] + 0.07, h[2] + 0.07, 0.016], [h[0], h[1] + 0.15, h[2] + 0.06, 0.01], [h[0], h[1] + 0.2, h[2] - 0.01, 0.003]], 6, true);
    spikes(ab, m.chitinLight, [h[0], h[1] + 0.06, h[2] + 0.05], [h[0], h[1] + 0.15, h[2] + 0.04], 3, 0.022, 0.005, [0, -0.3, -1]);
  })) body.add(a);

  for (const l of hexLegs(m.chitinDark, { pairs: 2, x: 0.09, y: 0.27, z0: -0.04, dz: 0.22, reach: 0.44, lift: 0.16, r: 0.02, jointMat: m.chitinLight, footMat: m.bone, spread: 1.1 })) root.add(l);
  body.add(marker('muzzle', 0, 0.585, 0.45));
  return root;
}

/** Shredder-Tick Platform (Gatling Tank) — six-legged tick with twin spinning spine-gatlings on a back turret. */
export function buildShredderTick(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  b.ellipsoid(m.chitinDark, 0.3, 0.13, 0.36, 0, 0.29, -0.05, 12);
  b.dome(m.chitin, 0.29, 0.1, 0.35, 0, 0.33, -0.06, 12);
  b.dome(m.chitinLight, 0.2, 0.06, 0.16, 0, 0.36, 0.14, 10);
  hring(b, m.team, 0.3, 0.36, 0.024, 0, 0.3, -0.05, 18);
  for (const s of [-1, 1]) b.ellipsoid(m.team, 0.06, 0.012, 0.08, s * 0.15, 0.405, -0.22, 6, 0, 0, s * 0.35);
  for (let i = -3; i <= 3; i++) { // festoons along the rear rim
    const a = PI + i * 0.3;
    b.ellipsoid(m.chitin, 0.045, 0.03, 0.035, Math.sin(a) * 0.29, 0.27, -0.05 + Math.cos(a) * 0.35, 6, 0, a, 0);
  }
  // capitulum with barbed hypostome and palps
  b.ellipsoid(m.chitinDark, 0.08, 0.06, 0.08, 0, 0.27, 0.33, 8);
  b.taper(m.bone, [0, 0.26, 0.38], [0, 0.23, 0.5], 0.026, 0.004, 6);
  for (const s of [-1, 1]) {
    spikes(b, m.bone, [0, 0.255, 0.4], [0, 0.24, 0.47], 3, 0.022, 0.006, [s, 0.2, -0.6]);
    chain(b, m.chitin, [[s * 0.06, 0.27, 0.37, 0.02], [s * 0.08, 0.25, 0.45, 0.015], [s * 0.06, 0.22, 0.5, 0.008]], 5);
  }
  eyes(b, m.eye, 0, 0.355, 0.25, 0.018, 0.13);
  body.add(b.build());

  // turret: muscle saddle, spine magazine sac and twin rotary spine-gatlings
  const t = new PartBuilder();
  t.ellipsoid(m.metal, 0.13, 0.045, 0.13, 0, 0.02, 0, 10);
  t.ellipsoid(m.flesh, 0.1, 0.06, 0.1, 0, 0.05, -0.02, 9);
  t.ellipsoid(m.flesh, 0.09, 0.07, 0.08, 0, 0.085, -0.12, 9);
  spikes(t, m.bone, [-0.05, 0.13, -0.15], [0.05, 0.13, -0.09], 5, 0.07, 0.01, [0, 1, -0.3]);
  t.ellipsoid(m.organ, 0.04, 0.03, 0.04, 0, 0.11, -0.04, 6);
  for (const s of [-1, 1]) {
    t.ellipsoid(m.chitin, 0.06, 0.05, 0.08, s * 0.09, 0.07, 0.02, 8);
    t.torus(m.team, 0.045, 0.012, 4, 10, s * 0.09, 0.07, 0.09);
  }
  const turret = pivot('turret', t, 0, 0.42, -0.08);
  for (const [i, s] of [-1, 1].entries()) {
    const g = new PartBuilder();
    g.cyl(m.metal, 0.018, 0.018, 0.26, 6, 0, 0, 0.1, PI / 2, 0, 0);
    for (let k = 0; k < 5; k++) {
      const p = (k / 5) * PI * 2;
      g.taper(m.bone, [Math.cos(p) * 0.03, Math.sin(p) * 0.03, -0.03], [Math.cos(p) * 0.03, Math.sin(p) * 0.03, 0.24], 0.011, 0.007, 5);
    }
    for (const z of [0.03, 0.17]) g.torus(m.metal, 0.036, 0.008, 4, 10, 0, 0, z);
    g.torus(m.chitinDark, 0.033, 0.006, 4, 10, 0, 0, 0.235);
    const sp = pivot(`spinZ${i}`, g, s * 0.09, 0.07, 0.12);
    sp.userData.speed = 9;
    turret.add(sp);
  }
  turret.add(marker('muzzle', -0.09, 0.07, 0.37));
  turret.add(marker('muzzle2', 0.09, 0.07, 0.37));
  body.add(turret);

  for (const l of hexLegs(m.chitinDark, { pairs: 3, x: 0.2, y: 0.26, z0: 0.16, dz: 0.17, reach: 0.36, lift: 0.14, r: 0.022, jointMat: m.chitinLight, footMat: m.bone, spread: 0.9 })) root.add(l);
  return root;
}

/** Hallucinogenic Spore Flea (Chaos Drone) — r 0.28, h 0.4. Mechanical flea hauling a sac of neuro-aerosol. */
export function buildSporeFlea(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // laterally flattened flea body with riveted plating
  b.ellipsoid(m.chitin, 0.1, 0.13, 0.2, 0, 0.22, -0.01, 10, 0.2, 0, 0);
  const ax = [0, -Math.sin(0.2), Math.cos(0.2)];
  for (const [t, mat] of [[0.12, m.metal], [0.04, m.team], [-0.05, m.metal], [-0.13, m.team]]) {
    const k = Math.sqrt(1 - (t / 0.2) ** 2) * 1.02;
    etorus(b, mat, 0.1 * k, 0.13 * k, 0.012, [0, 0.22 + ax[1] * t, -0.01 + ax[2] * t], [0.2, 0, 0], PI * 2, 4, 12);
  }
  for (const s of [-1, 1]) {
    b.dome(m.metal, 0.06, 0.02, 0.09, s * 0.093, 0.21, -0.01, 8, 0, 0, -s * PI / 2);
    for (const z of [-0.06, 0.04]) b.ellipsoid(m.chitinDark, 0.008, 0.008, 0.008, s * 0.114, 0.21, z, 4);
  }
  // head: lens eyes, proboscis and genal comb
  b.ellipsoid(m.chitinDark, 0.05, 0.055, 0.05, 0, 0.16, 0.19, 8);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.016, 0.016, 0.016, s * 0.04, 0.18, 0.21, 6);
  b.taper(m.bone, [0, 0.13, 0.22], [0, 0.06, 0.27], 0.012, 0.003, 5);
  spikes(b, m.bone, [-0.04, 0.12, 0.19], [0.04, 0.12, 0.19], 4, 0.035, 0.006, [0, -0.6, -0.5]);

  // payload: membrane sac of purple neuro-aerosol in a metal cage, vent at the back
  b.cyl(m.metal, 0.07, 0.085, 0.04, 10, 0, 0.33, -0.04);
  b.ellipsoid(m.membrane, 0.1, 0.085, 0.12, 0, 0.4, -0.05, 12);
  hring(b, m.metal, 0.102, 0.122, 0.01, 0, 0.4, -0.05, 14);
  etorus(b, m.metal, 0.102, 0.087, 0.008, [0, 0.4, -0.05], [0, 0, 0], PI, 3, 10);
  etorus(b, m.metal, 0.122, 0.087, 0.008, [0, 0.4, -0.05], [0, PI / 2, 0], PI, 3, 10);
  b.taper(m.metal, [0, 0.45, -0.12], [0, 0.49, -0.17], 0.022, 0.017, 8);
  ringAt(b, m.team, 0.02, 0.006, [0, 0.488, -0.168], [0, 0.04, -0.05], 8);
  b.ellipsoid(m.psy, 0.014, 0.008, 0.014, 0, 0.492, -0.173, 6);
  body.add(b.build());

  const gas = new PartBuilder();
  gas.ellipsoid(m.psy, 0.065, 0.055, 0.08, 0, 0, 0, 9);
  for (const [x, y, z] of [[0.03, 0.03, 0.03], [-0.035, -0.01, -0.03], [0.0, 0.035, -0.045]]) gas.ellipsoid(m.organ, 0.02, 0.02, 0.02, x, y, z, 5);
  body.add(pivot('pulseSac', gas, 0, 0.4, -0.05));
  body.add(marker('smoke', 0, 0.5, -0.18));

  // two pairs of spindly front legs + huge hydraulic jumping legs
  for (const l of hexLegs(m.metal, { pairs: 2, x: 0.06, y: 0.17, z0: 0.12, dz: 0.1, reach: 0.21, lift: 0.08, r: 0.012, jointMat: m.chitinDark, footMat: m.chitinDark, spread: 0.9 })) root.add(l);
  for (const s of [-1, 1]) {
    const g = new PartBuilder();
    const hy = 0.17;
    const K = [s * 0.11, 0.17, -0.12], Fo = [s * 0.21, -hy + 0.015, -0.02];
    bulge(g, m.chitin, [s * 0.01, -0.01, 0.01], K, 0.04, 1.05, 8);
    g.ellipsoid(m.metal, 0.026, 0.026, 0.026, ...K, 6);
    g.strut(m.metal, [s * 0.045, -0.03, 0.0], [s * 0.1, 0.14, -0.09], 0.008, 5);
    g.taper(m.chitinDark, K, Fo, 0.02, 0.01, 6);
    g.taper(m.chitinDark, Fo, [Fo[0] + s * 0.03, Fo[1], Fo[2] + 0.05], 0.009, 0.004, 4);
    root.add(pivot(s < 0 ? 'hexA2L' : 'hexB2R', g, s * 0.07, hy, -0.09));
  }
  return root;
}

/** Bio-Magnetic Trap Spider (Magnetron) — r 0.46. Arachnid with a horseshoe electromagnetic organ. */
export function buildTrapSpider(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // cephalothorax
  b.ellipsoid(m.chitin, 0.19, 0.11, 0.22, 0, 0.32, 0.05, 10);
  b.dome(m.chitinLight, 0.15, 0.06, 0.17, 0, 0.38, 0.03, 10);
  b.taper(m.chitinDark, [0, 0.33, -0.12], [0, 0.37, -0.16], 0.05, 0.05, 6);
  const ct = (x, y) => [x, y, 0.05 + 0.22 * Math.sqrt(Math.max(0, 1 - (x / 0.19) ** 2 - ((y - 0.32) / 0.11) ** 2))];
  for (const [x, y, r] of [[0.045, 0.37, 0.024], [0.09, 0.36, 0.015], [0.03, 0.4, 0.01], [0.07, 0.39, 0.01]]) {
    for (const s of [-1, 1]) b.ellipsoid(m.eye, r, r, r, ...ct(s * x, y), 6);
  }
  for (const s of [-1, 1]) {
    b.ellipsoid(m.chitinDark, 0.035, 0.05, 0.035, s * 0.05, 0.27, 0.25, 7);
    b.taper(m.bone, [s * 0.05, 0.23, 0.27], [s * 0.035, 0.17, 0.3], 0.014, 0.003, 5);
  }

  // abdomen with team hourglass and psychic veins
  b.ellipsoid(m.chitinDark, 0.25, 0.21, 0.29, 0, 0.42, -0.36, 12);
  etorus(b, m.team, 0.215, 0.18, 0.025, [0, 0.42, -0.2], [0, 0, 0], PI * 2, 4, 14);
  b.ellipsoid(m.team, 0.075, 0.022, 0.06, 0, 0.615, -0.29, 7);
  b.ellipsoid(m.team, 0.03, 0.022, 0.05, 0, 0.625, -0.38, 6);
  b.ellipsoid(m.team, 0.065, 0.022, 0.055, 0, 0.605, -0.47, 7);
  for (const s of [-1, 1]) {
    chain(b, m.organ, [[s * 0.19, 0.5, -0.2, 0.012], [s * 0.252, 0.42, -0.36, 0.012], [s * 0.19, 0.35, -0.52, 0.01]], 4, false);
    b.taper(m.chitinLight, [s * 0.03, 0.36, -0.62], [s * 0.04, 0.33, -0.68], 0.02, 0.008, 5);
  }

  // horseshoe electromagnetic organ on a fleshy stalk
  const C = [0, 0.5, 0.2], R = 0.13, tube = 0.034, tilt = 0.35, L = 0.13;
  const th = -PI / 2 + tilt;
  const D = [0, Math.cos(th), Math.sin(th)];   // arc apex (back & up)
  const P = [0, -Math.cos(th), -Math.sin(th)]; // prong direction (forward, slightly down)
  const apex = [0, C[1] + D[1] * R, C[2] + D[2] * R];
  b.taper(m.flesh, [0, 0.4, 0.08], apex, 0.045, 0.035, 7);
  b.torus(m.chitinLight, R, tube, 6, 16, ...C, th, 0, 0, PI);
  for (const a of [PI / 4, PI / 2, (3 * PI) / 4]) {
    const p = [Math.cos(a) * R, C[1] + Math.sin(a) * R * D[1], C[2] + Math.sin(a) * R * D[2]];
    const tg = [-Math.sin(a), Math.cos(a) * D[1], Math.cos(a) * D[2]];
    ringAt(b, a === PI / 2 ? m.team : m.metal, tube * 1.3, a === PI / 2 ? 0.014 : 0.01, p, tg, 10);
  }
  const tips = [];
  for (const s of [-1, 1]) {
    const st = [s * R, C[1], C[2]];
    const en = [st[0], st[1] + P[1] * L, st[2] + P[2] * L];
    tips.push(en);
    b.taper(m.chitinLight, st, en, tube, tube * 0.95, 8);
    for (const f of [0.3, 0.62]) ringAt(b, f < 0.5 ? m.team : m.metal, tube * 1.3, 0.01, [st[0], st[1] + P[1] * L * f, st[2] + P[2] * L * f], P, 10);
    b.ellipsoid(s < 0 ? m.psy : m.spark, 0.042, 0.042, 0.042, ...en, 7);
  }
  body.add(b.build());

  // crackling field between the poles (fast flicker) + muzzle at the horseshoe's focus
  const mz = [0, (tips[0][1] + tips[1][1]) / 2, (tips[0][2] + tips[1][2]) / 2 + 0.015];
  const arc = new PartBuilder();
  const zz = [[-0.1, 0, 0], [-0.06, 0.022, 0.01], [-0.02, -0.018, -0.008], [0.02, 0.02, 0.01], [0.06, -0.02, -0.006], [0.1, 0, 0]];
  for (let i = 1; i < zz.length; i++) arc.taper(m.spark, zz[i - 1], zz[i], 0.006, 0.006, 4);
  arc.ellipsoid(m.psy, 0.02, 0.02, 0.02, 0, 0, 0, 6);
  body.add(pivot('glowArc', arc, ...mz));
  body.add(marker('muzzle', ...mz));

  for (const l of hexLegs(m.chitinDark, { pairs: 4, x: 0.15, y: 0.3, z0: 0.2, dz: 0.13, reach: 0.5, lift: 0.2, r: 0.02, jointMat: m.chitinLight, footMat: m.bone, spread: 1.2 })) root.add(l);
  return root;
}

/** Overmind Cerebral Behemoth (Master Mind) — r 0.66, h 1.0. Multi-legged chassis carrying a giant brain in a glass dome. */
export function buildOvermindBehemoth(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // segmented bio-mechanical chassis
  b.ellipsoid(m.chitinDark, 0.42, 0.17, 0.66, 0, 0.34, -0.05, 14);
  plates(b, m.chitin, 0, 0.4, 0.4, -0.55, 5, 0.42, 0.13, 0.15, 10);
  hring(b, m.team, 0.43, 0.67, 0.03, 0, 0.36, -0.05, 20);
  for (const s of [-1, 1]) {
    for (const z of [0.3, -0.05, -0.4]) b.dome(m.metal, 0.11, 0.03, 0.13, s * 0.4, 0.33, z, 8, 0, 0, -s * PI / 2);
  }
  // head
  b.ellipsoid(m.chitin, 0.22, 0.15, 0.17, 0, 0.37, 0.66, 10);
  hring(b, m.team, 0.195, 0.15, 0.02, 0, 0.44, 0.66, 14);
  eyes(b, m.eye, 0, 0.42, 0.79, 0.04, 0.1);
  for (const s of [-1, 1]) {
    b.ellipsoid(m.eye, 0.02, 0.02, 0.02, s * 0.16, 0.44, 0.74, 6);
    chain(b, m.bone, [[s * 0.1, 0.3, 0.76, 0.035], [s * 0.12, 0.26, 0.86, 0.025], [s * 0.06, 0.24, 0.92, 0.01]], 6, false);
  }
  // rear life-support tanks
  for (const s of [-1, 1]) {
    b.cyl(m.metal, 0.095, 0.095, 0.04, 10, s * 0.2, 0.49, -0.58);
    b.cyl(m.membrane, 0.085, 0.085, 0.26, 10, s * 0.2, 0.62, -0.58);
    b.cyl(m.organ, 0.06, 0.06, 0.2, 8, s * 0.2, 0.6, -0.58);
    b.cyl(m.metal, 0.09, 0.09, 0.03, 10, s * 0.2, 0.75, -0.58);
    b.taper(m.flesh, [s * 0.2, 0.76, -0.58], [s * 0.18, 0.62, -0.38], 0.022, 0.022, 6);
  }
  b.taper(m.chitinDark, [0, 0.32, -0.66], [0, 0.26, -0.82], 0.12, 0.05, 8);

  // glass dome housing
  b.cyl(m.metal, 0.42, 0.44, 0.08, 16, 0, 0.59, -0.05);
  hring(b, m.team, 0.43, 0.43, 0.022, 0, 0.62, -0.05, 20);
  b.dome(m.membrane, 0.4, 0.4, 0.4, 0, 0.63, -0.05, 14);
  etorus(b, m.metal, 0.405, 0.405, 0.012, [0, 0.63, -0.05], [0, 0, 0], PI, 3, 14);
  etorus(b, m.metal, 0.405, 0.405, 0.012, [0, 0.63, -0.05], [0, PI / 2, 0], PI, 3, 14);
  hring(b, m.metal, 0.35, 0.35, 0.01, 0, 0.83, -0.05, 16);
  for (let i = 0; i < 4; i++) { // psionic emitter spines around the base
    const a = (i / 4) * PI * 2 + PI / 4;
    const u = [Math.cos(a), Math.sin(a)];
    b.taper(m.bone, [u[0] * 0.4, 0.62, -0.05 + u[1] * 0.4], [u[0] * 0.49, 0.8, -0.05 + u[1] * 0.49], 0.022, 0.008, 5);
    b.ellipsoid(m.psy, 0.018, 0.018, 0.018, u[0] * 0.49, 0.8, -0.05 + u[1] * 0.49, 5);
  }
  body.add(b.build());

  // enormous throbbing brain (slow pulse)
  const br = new PartBuilder();
  brain(br, m.flesh, m.organ, m.psy, 0, 0, 0, 0.28, 0.165, 0.3, { seg: 12, arcs: 3, ts: 9, tube: 0.013 });
  body.add(pivot('pulseBrain', br, 0, 0.795, -0.05));
  body.add(marker('muzzle', 0, 0.97, -0.05));

  for (const l of hexLegs(m.chitinDark, { pairs: 4, x: 0.3, y: 0.3, z0: 0.45, dz: 0.3, reach: 0.42, lift: 0.1, r: 0.045, jointMat: m.metal, footMat: m.bone, spread: 0.35 })) root.add(l);
  return root;
}

/** Levitating Bio-UFO (Floating Disc, hover) — r 0.55. Luminescent jellyfish-beetle saucer with a spinning rim. */
export function buildBioUFO(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // underside disc and translucent jelly bell
  b.ellipsoid(m.chitinDark, 0.5, 0.09, 0.5, 0, 0.42, 0, 16);
  b.dome(m.membrane, 0.5, 0.3, 0.5, 0, 0.44, 0, 16);
  for (let i = 0; i < 4; i++) { // gonad crescents glowing through the bell
    const a = (i / 4) * PI * 2 + PI / 4;
    const u = [Math.cos(a), 0, Math.sin(a)];
    orientEllipsoid(b, m.organ, [u[0] * 0.22, 0.52, u[2] * 0.22], [-u[2], 0, u[0]], [0, 1, 0], 0.11, 0.035, 0.05, 8);
  }
  for (let i = 0; i < 8; i++) { // radial canals
    const a = (i / 8) * PI * 2;
    b.taper(m.psy, [Math.cos(a) * 0.08, 0.48, Math.sin(a) * 0.08], [Math.cos(a) * 0.46, 0.46, Math.sin(a) * 0.46], 0.008, 0.005, 4);
  }
  // beetle crown and elytral ribs over the bell
  b.dome(m.chitin, 0.17, 0.09, 0.17, 0, 0.71, 0, 10);
  hring(b, m.team, 0.172, 0.172, 0.024, 0, 0.72, 0, 14);
  b.ellipsoid(m.psy, 0.04, 0.03, 0.04, 0, 0.8, 0, 6);
  for (const ry of [0, PI / 2, PI / 4, -PI / 4]) etorus(b, ry === 0 || ry === PI / 2 ? m.chitinLight : m.team, 0.505, 0.305, 0.014, [0, 0.44, 0], [0, ry, 0], PI, 3, 14);
  // the eye underneath, anti-gravity sacs and dangling tendrils
  hring(b, m.chitinDark, 0.085, 0.085, 0.025, 0, 0.335, 0, 12);
  b.ellipsoid(m.eye, 0.075, 0.055, 0.075, 0, 0.33, 0, 10);
  b.ellipsoid(m.chitinDark, 0.03, 0.01, 0.03, 0, 0.277, 0, 6);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + PI / 6;
    b.ellipsoid(m.organ, 0.06, 0.04, 0.06, Math.cos(a) * 0.26, 0.345, Math.sin(a) * 0.26, 7);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    const u = [Math.cos(a), Math.sin(a)], t = [-u[1], u[0]];
    const P = (r, w, y) => [u[0] * r + t[0] * w, y, u[1] * r + t[1] * w];
    chain(b, m.organ, [[...P(0.4, 0, 0.37), 0.014], [...P(0.43, 0.03, 0.26), 0.011], [...P(0.39, -0.02, 0.15), 0.008], [...P(0.42, 0.01, 0.065), 0.005]], 4, false);
    b.ellipsoid(m.psy, 0.014, 0.014, 0.014, ...P(0.42, 0.01, 0.05), 5);
  }
  for (let i = 0; i < 4; i++) { // frilly oral arms
    const a = (i / 4) * PI * 2;
    const u = [Math.cos(a), Math.sin(a)];
    chain(b, m.flesh, [[u[0] * 0.1, 0.33, u[1] * 0.1, 0.03], [u[0] * 0.15, 0.24, u[1] * 0.15, 0.024], [u[0] * 0.11, 0.15, u[1] * 0.11, 0.014]], 6);
  }
  body.add(b.build());

  const core = new PartBuilder();
  core.ellipsoid(m.psy, 0.15, 0.09, 0.15, 0, 0, 0, 10);
  body.add(pivot('pulseCore', core, 0, 0.55, 0));

  // spinning chitin rim with alternating team & psychic lights
  const r = new PartBuilder();
  hring(r, m.chitin, 0.56, 0.56, 0.045, 0, 0, 0, 28);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const u = [Math.cos(a), 0, Math.sin(a)];
    orientEllipsoid(r, m.chitinLight, [u[0] * 0.58, 0.018, u[2] * 0.58], [-u[2], 0, u[0]], u, 0.12, 0.07, 0.025, 7);
    r.ellipsoid(i % 2 ? m.glow : m.psy, 0.028, 0.022, 0.028, u[0] * 0.64, 0.0, u[2] * 0.64, 6);
  }
  const rim = pivot('spinYRim', r, 0, 0.43, 0);
  rim.userData.speed = 1.2;
  body.add(rim);
  body.add(marker('muzzle', 0, 0.26, 0));
  return root;
}

/** Cortex Larva Crawler (MCV) — r 0.7, h 1.0. Bloated brain-larva carrying a dormant cortex in a bone cage. */
export function buildCortexLarva(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // bloated segmented grub
  const segs = [[0.45, 0.32, 0.28, 0.42], [0.15, 0.4, 0.34, 0.45], [-0.17, 0.44, 0.36, 0.46], [-0.48, 0.42, 0.34, 0.45], [-0.76, 0.32, 0.27, 0.41], [-0.98, 0.2, 0.18, 0.35]];
  for (const [i, [z, rx, ry, y]] of segs.entries()) {
    b.ellipsoid(m.flesh, rx, ry, 0.2, 0, y, z, 10);
    if (i > 0) {
      const p = segs[i - 1];
      const team2 = i === 2 || i === 4;
      etorus(b, team2 ? m.team : m.chitinDark, (rx + p[1]) * 0.33, (ry + p[2]) * 0.33, team2 ? 0.05 : 0.035, [0, (y + p[3]) / 2, (z + p[0]) / 2], [0, 0, 0], PI * 2, 3, 12);
    }
    if (i >= 1 && i <= 4) for (const s of [-1, 1]) b.ellipsoid(m.organ, 0.028, 0.028, 0.028, s * rx * 0.97, y, z, 5); // spiracles
    if (i === 0 || i >= 4) b.dome(m.chitin, rx * 0.75, 0.07, 0.14, 0, y + ry - 0.06, z, 10);
  }
  for (const [s, z] of [[-1, -0.7], [1, -0.78], [1, -0.55], [-1, -0.92]]) {
    cordyceps(b, m, [s * 0.18, 0.62, z], [s * 0.26, 0.8, z - 0.04], 0.018);
  }
  // head capsule
  b.ellipsoid(m.chitinDark, 0.24, 0.2, 0.2, 0, 0.38, 0.68, 12);
  hring(b, m.team, 0.22, 0.17, 0.025, 0, 0.47, 0.68, 14);
  for (const [x, y, r] of [[0.07, 0.44, 0.032], [0.14, 0.42, 0.024], [0.04, 0.5, 0.02], [0.11, 0.49, 0.018]]) {
    for (const s of [-1, 1]) {
      const zz = 0.68 + 0.2 * Math.sqrt(Math.max(0, 1 - (x / 0.24) ** 2 - ((y - 0.38) / 0.2) ** 2));
      b.ellipsoid(m.eye, r, r, r, s * x, y, zz - r * 0.3, 5);
    }
  }
  for (const s of [-1, 1]) chain(b, m.chitinLight, [[s * 0.1, 0.27, 0.82, 0.04], [s * 0.13, 0.24, 0.92, 0.028], [s * 0.06, 0.22, 0.98, 0.012]], 6, false);

  // dormant cortex: bone rib cage, cocoon veil and nerve cords
  ribs(b, m.bone, 0, 0.78, -0.17, 0.32, 4, 0.024, 'z', 0.5);
  for (let i = 0; i < 4; i++) {
    const z = -0.17 + (i / 3 - 0.5) * 0.5;
    for (const s of [-1, 1]) b.taper(m.bone, [s * 0.32, 0.79, z], [s * 0.35, 0.64, z], 0.026, 0.02, 5);
  }
  hring(b, m.bone, 0.3, 0.29, 0.03, 0, 0.72, -0.17, 16);
  b.ellipsoid(m.membrane, 0.31, 0.19, 0.3, 0, 0.84, -0.17, 12);
  for (const s of [-1, 1]) b.taper(m.organ, [s * 0.12, 0.72, -0.02], [s * 0.2, 0.62, 0.18], 0.02, 0.012, 5);
  body.add(b.build());
  for (const a of antennae(m.chitinDark, { y: 0.52, z: 0.76, len: 0.22, spread: 0.08, r: 0.012, curve: 0.3, tipMat: m.organ })) body.add(a);

  const br = new PartBuilder();
  brain(br, m.flesh, m.flesh, m.organ, 0, 0, 0, 0.28, 0.15, 0.26, { seg: 10, arcs: 2, ts: 8, tube: 0.013 });
  body.add(pivot('pulseCortex', br, 0, 0.84, -0.17));

  for (const l of hexLegs(m.flesh, { pairs: 4, x: 0.34, y: 0.24, z0: 0.42, dz: 0.3, reach: 0.24, lift: 0.04, r: 0.055, jointMat: m.chitinDark, footMat: m.chitinDark, spread: 0.2 })) root.add(l);
  return root;
}

export const MODELS = {
  broodQueen: buildBroodQueen,
  mantisRover: buildMantisRover,
  shredderTick: buildShredderTick,
  sporeFlea: buildSporeFlea,
  trapSpider: buildTrapSpider,
  overmindBehemoth: buildOvermindBehemoth,
  bioUFO: buildBioUFO,
  cortexLarva: buildCortexLarva,
};
