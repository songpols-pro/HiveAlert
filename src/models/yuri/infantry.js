// YURI infantry — psionic grubs, mutants and parasites: violet chitin, pink brain-flesh, bone,
// fungal growths and glowing psychic organs. Legs on the root, torso in `body`.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { PartBuilder, pivot, marker, eyes, chain, spikes, bipedLegs, arms, antennae, mandibles } from '../insectKit.js';

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
function etorus(b, mat, rx, ry, tube, pos, rot = [0, 0, 0], arc = PI * 2, rs = 3, ts = 10) {
  const k = (rx + ry) / 2;
  b.add(mat, new THREE.TorusGeometry(1, tube / k, rs, ts, arc), pos, rot, [rx, ry, k]);
}

/** Horizontal elliptical band (belts, collars, segment creases). */
function hring(b, mat, rx, rz, tube, x, y, z, ts = 8) {
  etorus(b, mat, rx, rz, tube, [x, y, z], [PI / 2, 0, 0], PI * 2, 3, ts);
}

/** Ring whose axis follows `dir` (wrist bands, segment rings on curved bodies). */
function ringAt(b, mat, r, tube, p, dir, ts = 8) {
  const e = eulerTo(dir, _ZA);
  b.torus(mat, r, tube, 3, ts, p[0], p[1], p[2], e[0], e[1], e[2]);
}

/** Ellipsoid stretched between points a and c (muscle bulges, plates along limbs). */
function bulge(b, mat, a, c, r, k = 1, seg = 6) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c);
  const d = C.clone().sub(A);
  const len = d.length();
  const e = eulerTo([d.x, d.y, d.z]);
  const mid = A.add(C).multiplyScalar(0.5);
  b.ellipsoid(mat, r, len * 0.5 * k, r, mid.x, mid.y, mid.z, seg, e[0], e[1], e[2]);
}

/** z of the front surface of an ellipsoid at (x, y). */
function surfZ(cx, cy, cz, rx, ry, rz, x, y) {
  const u = (x - cx) / rx, v = (y - cy) / ry;
  return cz + rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));
}

/**
 * Brain: two hemispheres with raised gyri arcs and a glowing central fissure.
 * rx = half-width of the whole brain.
 */
function brain(b, lobe, ridge, fissure, cx, cy, cz, rx, ry, rz, o = {}) {
  const { seg = 8, arcs = 2, ts = 6, tube = 0.006, fseg = 6 } = o;
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

function rigRoot() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);
  return { root, body };
}

// ------------------------------------------------------------------ models

/** Telekinetic Spitter Maggot (Initiate) — many-eyed bipedal grub with an oversized exposed brain. */
export function buildSpitterMaggot(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // soft segmented grub trunk, leaning forward
  b.ellipsoid(m.flesh, 0.052, 0.04, 0.048, 0, 0.19, -0.005, 6);
  b.ellipsoid(m.flesh, 0.062, 0.042, 0.056, 0, 0.232, 0.002, 7);
  b.ellipsoid(m.flesh, 0.058, 0.04, 0.053, 0, 0.276, 0.012, 7);
  b.ellipsoid(m.flesh, 0.05, 0.036, 0.048, 0, 0.318, 0.024, 7);
  hring(b, m.chitinDark, 0.055, 0.05, 0.007, 0, 0.21, -0.002);
  hring(b, m.team, 0.063, 0.057, 0.011, 0, 0.254, 0.006);
  hring(b, m.chitinDark, 0.057, 0.052, 0.007, 0, 0.298, 0.018);
  hring(b, m.team, 0.05, 0.046, 0.01, 0, 0.336, 0.03);              // collar
  b.ellipsoid(m.chitin, 0.044, 0.03, 0.018, 0, 0.278, -0.036, 6, -0.25, 0, 0); // back plates
  b.ellipsoid(m.chitin, 0.046, 0.03, 0.018, 0, 0.236, -0.05, 6, -0.1, 0, 0);
  for (const p of [[-0.028, 0.252, -0.05], [0.03, 0.258, -0.046], [0.0, 0.3, -0.03]]) b.ellipsoid(m.organ, 0.01, 0.01, 0.01, ...p, 5); // psychic pustules

  // face: round lamprey maw ringed by many eyes
  b.ellipsoid(m.flesh, 0.048, 0.04, 0.046, 0, 0.352, 0.04, 7);
  b.torus(m.bone, 0.017, 0.006, 3, 8, 0, 0.342, 0.082);
  b.ellipsoid(m.chitinDark, 0.015, 0.015, 0.006, 0, 0.342, 0.08, 6);
  b.ellipsoid(m.fire, 0.008, 0.008, 0.005, 0, 0.342, 0.085, 5);      // pyrokinetic ember in the throat
  spikes(b, m.bone, [-0.011, 0.356, 0.084], [0.011, 0.356, 0.084], 3, 0.011, 0.003, [0, -1, 0.3]);
  for (const [x, y, r] of [[0, 0.372, 0.011], [-0.021, 0.368, 0.01], [0.021, 0.368, 0.01], [-0.036, 0.356, 0.008], [0.036, 0.356, 0.008], [-0.03, 0.334, 0.007], [0.03, 0.334, 0.007]]) {
    b.ellipsoid(m.eye, r, r, r, x, y, surfZ(0, 0.352, 0.04, 0.048, 0.04, 0.046, x, y) - r * 0.3, 5);
  }

  // the oversized exposed brain lobe in a bone skull rim
  hring(b, m.bone, 0.068, 0.072, 0.009, 0, 0.372, -0.005);
  brain(b, m.flesh, m.flesh, m.psy, 0, 0.41, -0.005, 0.078, 0.056, 0.08, { seg: 8, arcs: 2, ts: 6, tube: 0.0055 });
  body.add(b.build());

  // stubby claws cupping telekinetic flames
  for (const a of arms(m.chitinDark, { x: 0.058, y: 0.31, z: 0.03, len: 0.1, r: 0.009, jointMat: m.flesh }, (ab, s, h) => {
    for (const d of [-1, 0, 1]) ab.taper(m.chitinDark, h, [h[0] + d * 0.008 - s * 0.006, h[1] + 0.006, h[2] + 0.02], 0.005, 0.0015, 4);
    ab.ellipsoid(m.psy, 0.011, 0.011, 0.011, h[0] - s * 0.012, h[1] + 0.012, h[2] + 0.014, 6);
  })) body.add(a);
  for (const l of bipedLegs(m.chitinDark, { x: 0.035, y: 0.18, r: 0.014, knee: 0.04, jointMat: m.flesh, footMat: m.chitin })) root.add(l);
  body.add(marker('muzzle', 0, 0.3, 0.13));
  return root;
}

/** Mutated Stag Brawler (Brute) — r 0.22, h 0.6. Hulking beetle with swollen limbs and serrated bone knuckles. */
export function buildStagBrawler(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  b.ellipsoid(m.chitinDark, 0.085, 0.055, 0.07, 0, 0.25, -0.01, 6);          // pelvis
  b.ellipsoid(m.flesh, 0.082, 0.072, 0.072, 0, 0.312, 0.022, 7);             // swollen gut
  hring(b, m.chitinDark, 0.078, 0.07, 0.008, 0, 0.31, 0.025);
  b.ellipsoid(m.chitin, 0.15, 0.105, 0.115, 0, 0.41, -0.02, 8);              // massive thorax
  b.dome(m.chitinLight, 0.13, 0.1, 0.1, 0, 0.44, -0.06, 8, -0.5, 0, 0);      // hunched hump
  b.box(m.chitinDark, 0.012, 0.012, 0.16, 0, 0.535, -0.07, -0.5, 0, 0);      // elytra seam
  etorus(b, m.team, 0.145, 0.108, 0.014, [0, 0.375, -0.012], [PI / 2, 0, 0], PI * 2, 3, 10); // chest belt
  spikes(b, m.bone, [0, 0.54, -0.04], [0, 0.48, -0.14], 3, 0.06, 0.014, [0, 0.6, -0.8]); // dorsal spines
  for (const p of [[-0.07, 0.49, -0.1], [0.075, 0.5, -0.08]]) b.ellipsoid(m.organ, 0.018, 0.018, 0.018, ...p, 5); // mutagen boils

  // small low head
  b.ellipsoid(m.chitinDark, 0.05, 0.045, 0.055, 0, 0.42, 0.115, 7);
  b.ellipsoid(m.chitin, 0.055, 0.018, 0.04, 0, 0.455, 0.12, 6);              // brow plate
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.012, 0.012, 0.012, s * 0.03, 0.432, 0.158, 5);
  body.add(b.build());
  for (const md of mandibles(m.chitinLight, { x: 0.05, y: 0.41, z: 0.15, len: 0.12, r: 0.015, curve: 0.7 })) body.add(md);

  // grotesquely swollen arms with huge fists
  const L = 0.28;
  const e = [0.02, -L * 0.45, L * 0.2];
  for (const a of arms(m.flesh, { x: 0.16, y: 0.46, z: 0.0, len: L, r: 0.032, jointMat: m.chitinDark }, (ab, s, h) => {
    const el = [s * e[0], e[1], e[2]];
    bulge(ab, m.flesh, [0, 0, 0], el, 0.052, 0.95);                           // bicep
    bulge(ab, m.flesh, el, h, 0.048, 0.9);                                    // forearm
    bulge(ab, m.chitinDark, [el[0], el[1] + 0.032, el[2] + 0.005], [h[0], h[1] + 0.032, h[2] - 0.03], 0.036, 0.85, 5); // bracer
    ab.dome(m.team, 0.066, 0.046, 0.066, s * 0.01, 0.012, 0, 6, 0, 0, -s * 0.4); // pauldron
    ringAt(ab, m.team, 0.04, 0.011, [h[0], h[1] - 0.002, h[2] - 0.012], [0, 0.18, 1]);
    ab.ellipsoid(m.chitin, 0.058, 0.052, 0.056, h[0], h[1], h[2] + 0.035, 7); // fist
    ab.ellipsoid(m.bone, 0.052, 0.018, 0.02, h[0], h[1] + 0.008, h[2] + 0.075, 5); // knuckle plate
    spikes(ab, m.bone, [h[0] - 0.036, h[1] + 0.012, h[2] + 0.078], [h[0] + 0.036, h[1] + 0.012, h[2] + 0.078], 4, 0.045, 0.013, [0, 0.15, 1]);
    spikes(ab, m.bone, [s * 0.03, -0.03, -0.02], [el[0] + s * 0.02, el[1], el[2] - 0.02], 1, 0.035, 0.01, [s * 0.4, 0, -1]); // elbow spur
  })) body.add(a);

  const legs = bipedLegs(m.chitinDark, { x: 0.075, y: 0.24, r: 0.03, knee: 0.05, jointMat: m.flesh, footMat: m.chitin });
  for (const [i, l] of legs.entries()) {
    const s = i === 0 ? -1 : 1;
    const t = new PartBuilder();
    bulge(t, m.flesh, [0, 0, 0], [s * 0.01, -0.12, 0.05], 0.045, 0.8, 5);    // thigh muscle
    l.add(t.build());
    root.add(l);
  }
  body.add(marker('muzzle', 0, 0.37, 0.33));
  return root;
}

/** Cordyceps Sniper Wasp (Virus) — slender hooded assassin with an ultra-long spore-stinger rifle. */
export function buildSniperWasp(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // slim wasp body
  b.ellipsoid(m.chitinDark, 0.034, 0.03, 0.034, 0, 0.215, -0.01, 7);            // pelvis
  b.ellipsoid(m.chitin, 0.044, 0.06, 0.042, 0, 0.295, 0.0, 8);                  // thorax
  b.taper(m.chitinDark, [0, 0.25, -0.025], [0, 0.222, -0.065], 0.012, 0.009, 5); // petiole
  b.ellipsoid(m.chitin, 0.04, 0.04, 0.086, 0, 0.2, -0.125, 8, -0.35, 0, 0);     // abdomen
  const ax = [0, Math.sin(0.35), Math.cos(0.35)];
  for (const [t, r, mat] of [[0.03, 0.039, m.team], [-0.015, 0.041, m.chitinDark], [-0.05, 0.034, m.team]]) {
    ringAt(b, mat, r, 0.007, [0, 0.2 + ax[1] * t, -0.125 + ax[2] * t], ax);
  }
  b.taper(m.bone, [0, 0.171, -0.205], [0, 0.152, -0.25], 0.008, 0.001, 4);     // stinger

  // head under a pointed hood
  b.ellipsoid(m.chitinLight, 0.031, 0.031, 0.034, 0, 0.385, 0.024, 7);
  eyes(b, m.eye, 0, 0.392, 0.05, 0.014, 0.021);
  b.dome(m.chitinDark, 0.05, 0.055, 0.052, 0, 0.375, 0.0, 8);
  b.taper(m.chitinDark, [0, 0.41, -0.03], [0, 0.37, -0.095], 0.022, 0.003, 5); // hood peak
  hring(b, m.team, 0.05, 0.052, 0.006, 0, 0.377, 0.0);                       // hood trim
  b.dome(m.team, 0.06, 0.022, 0.05, 0, 0.33, 0.0, 8);                         // mantle
  for (const s of [-1, 1]) { // tattered membrane cloak
    b.polygon(m.membrane, [[0, 0.37, -0.035], [s * 0.052, 0.34, -0.025], [s * 0.074, 0.2, -0.06], [s * 0.045, 0.15, -0.09], [s * 0.016, 0.17, -0.075], [0, 0.155, -0.085]]);
  }
  b.taper(m.chitinDark, [-0.01, 0.37, 0.05], [-0.014, 0.355, 0.062], 0.004, 0.0015, 3); // mandibles
  b.taper(m.chitinDark, [0.01, 0.37, 0.05], [0.014, 0.355, 0.062], 0.004, 0.0015, 3);

  // ultra-long stinger rifle loaded with a fungal spore drum
  const rx = 0.035, ry = 0.31;
  b.taper(m.chitinDark, [rx, ry - 0.012, -0.065], [rx, ry, 0.0], 0.016, 0.012, 5); // stock
  b.ellipsoid(m.chitinDark, 0.016, 0.02, 0.05, rx, ry, 0.04, 7);                 // receiver
  b.ellipsoid(m.flesh, 0.019, 0.022, 0.026, rx, ry - 0.03, 0.05, 7);             // spore drum
  for (const [dy, dz] of [[0.008, -0.015], [-0.006, 0.0], [0.006, 0.016]]) { // cordyceps clubs sprouting from the drum
    const e = [rx + 0.042, ry - 0.022 + dy * 1.5, 0.05 + dz * 1.5];
    b.taper(m.bone, [rx + 0.014, ry - 0.03 + dy, 0.05 + dz], e, 0.003, 0.002, 3);
    b.ellipsoid(m.organ, 0.006, 0.008, 0.006, ...e, 5);
  }
  b.cyl(m.metal, 0.007, 0.007, 0.06, 5, rx, ry + 0.024, 0.09, PI / 2, 0, 0);   // scope
  b.ellipsoid(m.eye, 0.008, 0.008, 0.004, rx, ry + 0.024, 0.121, 5);
  b.taper(m.chitinLight, [rx, ry, 0.08], [rx, ry, 0.39], 0.009, 0.005, 6);     // barrel
  for (const z of [0.15, 0.22, 0.29]) b.torus(m.bone, 0.009, 0.003, 3, 6, rx, ry, z);
  b.torus(m.team, 0.011, 0.004, 3, 6, rx, ry, 0.11);
  b.taper(m.bone, [rx, ry, 0.39], [rx, ry, 0.425], 0.005, 0.001, 4);          // stinger needle
  b.ellipsoid(m.psy, 0.007, 0.007, 0.01, rx, ry, 0.386, 5);

  // fixed aiming arms
  b.taper(m.chitinDark, [0.045, 0.33, 0.0], [0.068, 0.27, 0.02], 0.009, 0.007, 5);
  b.taper(m.chitinDark, [0.068, 0.27, 0.02], [0.042, 0.296, 0.052], 0.007, 0.005, 5);
  b.taper(m.chitinDark, [-0.045, 0.33, 0.0], [-0.03, 0.27, 0.08], 0.009, 0.007, 5);
  b.taper(m.chitinDark, [-0.03, 0.27, 0.08], [0.028, 0.3, 0.15], 0.007, 0.005, 5);
  b.ellipsoid(m.chitin, 0.008, 0.008, 0.008, 0.028, 0.3, 0.15, 5);
  body.add(b.build());

  for (const a of antennae(m.chitinDark, { y: 0.405, z: 0.035, len: 0.1, spread: 0.012, r: 0.004, curve: 0.3 })) body.add(a);
  for (const l of bipedLegs(m.chitinDark, { x: 0.032, y: 0.2, r: 0.011, knee: 0.045, footMat: m.chitin })) root.add(l);
  body.add(marker('muzzle', rx, ry, 0.43));
  return root;
}

/** Mind-Weaver Cerebral Larva (Yuri Clone) — h 0.55. Hovering psionic worm with a translucent skull. */
export function buildMindWeaver(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // S-curved worm body floating above the ground
  const pts = [[0, 0.07, -0.08, 0.018], [0, 0.12, -0.115, 0.03], [0, 0.19, -0.1, 0.042], [0, 0.26, -0.06, 0.05], [0, 0.32, -0.01, 0.052], [0, 0.37, 0.03, 0.047]];
  chain(b, m.flesh, pts, 6);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = pts[i - 1];
    const dir = [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const mat = i === 2 || i === 4 ? m.team : m.chitinDark;
    ringAt(b, mat, p[3] * 0.98, i === 2 || i === 4 ? 0.01 : 0.006, [p[0], p[1], p[2]], dir, 8);
    if (i > 2) { // dorsal carapace plates
      const len = Math.hypot(dir[1], dir[2]);
      b.ellipsoid(m.chitin, p[3] * 0.8, p[3] * 0.6, p[3] * 0.35, 0, p[1] + dir[2] / len * p[3] * 0.7, p[2] - dir[1] / len * p[3] * 0.7, 6, Math.atan2(dir[2], dir[1]), 0, 0);
    }
  }
  for (const s of [-1, 1]) { // vestigial claws
    chain(b, m.chitinDark, [[s * 0.04, 0.33, 0.01, 0.009], [s * 0.065, 0.3, 0.05, 0.007], [s * 0.05, 0.28, 0.08, 0.004]], 4, false);
  }

  // lamprey face with feeding tendrils
  b.ellipsoid(m.flesh, 0.045, 0.038, 0.045, 0, 0.395, 0.07, 7);
  for (const [x, y] of [[-0.02, 0.405], [0.02, 0.405], [-0.034, 0.39], [0.034, 0.39]]) b.ellipsoid(m.eye, 0.008, 0.008, 0.008, x, y, surfZ(0, 0.395, 0.07, 0.045, 0.038, 0.045, x, y) - 0.002, 5);
  b.torus(m.bone, 0.012, 0.004, 3, 6, 0, 0.375, 0.106, 0.3, 0, 0);
  for (const s of [-1, 1]) chain(b, m.flesh, [[s * 0.01, 0.37, 0.105, 0.006], [s * 0.018, 0.335, 0.12, 0.004], [s * 0.012, 0.305, 0.115, 0.0025]], 4, false);

  // translucent skull with bone sutures
  hring(b, m.bone, 0.062, 0.07, 0.008, 0, 0.405, 0.04);
  hring(b, m.team, 0.05, 0.056, 0.008, 0, 0.392, 0.04);
  etorus(b, m.bone, 0.082, 0.072, 0.004, [0, 0.462, 0.04], [0, PI / 2, 0], PI, 3, 8);
  b.ellipsoid(m.membrane, 0.075, 0.07, 0.082, 0, 0.462, 0.04, 8);
  body.add(b.build());

  // glowing brain inside the skull (slow pulse)
  const br = new PartBuilder();
  brain(br, m.psy, m.flesh, m.organ, 0, 0, 0, 0.11, 0.05, 0.062, { seg: 7, arcs: 2, ts: 6, tube: 0.004 });
  body.add(pivot('pulseBrain', br, 0, 0.462, 0.04));

  // levitation field rings (fast pulse)
  const fld = new PartBuilder();
  hring(fld, m.psy, 0.075, 0.075, 0.006, 0, 0, 0, 12);
  hring(fld, m.psy, 0.05, 0.05, 0.005, 0, 0.04, 0, 10);
  body.add(pivot('glowField', fld, 0, 0.03, -0.085));
  body.add(marker('muzzle', 0, 0.47, 0.1));
  return root;
}

/** Master Mind-Weaver (Yuri Prime hero, hover) — r 0.24, h 0.7. Brain-emperor cradled by mantis limbs. */
export function buildMasterMindWeaver(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  // cradle bowl & collar
  b.dome(m.chitin, 0.15, 0.085, 0.15, 0, 0.425, 0, 8, PI, 0, 0);
  hring(b, m.team, 0.155, 0.155, 0.016, 0, 0.425, 0, 12);
  hring(b, m.metal, 0.1, 0.1, 0.02, 0, 0.365, 0, 8);
  // brain stem and dangling spine
  b.taper(m.flesh, [0, 0.36, 0], [0, 0.29, -0.02], 0.045, 0.03, 6);
  chain(b, m.bone, [[0, 0.3, -0.02, 0.026], [0, 0.21, -0.04, 0.02], [0, 0.13, -0.025, 0.014], [0, 0.06, 0.01, 0.008]], 5);
  // dangling psychic tendrils
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const c = Math.cos(a), s = Math.sin(a);
    chain(b, m.flesh, [[c * 0.07, 0.36, s * 0.07, 0.014], [c * 0.115, 0.22, s * 0.115, 0.01], [c * 0.12, 0.07, s * 0.12, 0.005]], 4, false);
    b.ellipsoid(m.organ, 0.013, 0.016, 0.013, c * 0.12, 0.055, s * 0.12, 5);
  }

  // four biomechanical mantis limbs cradling the brain
  for (const deg of [55, 125, 235, 305]) {
    const a = (deg * PI) / 180;
    const u = [Math.cos(a), 0, Math.sin(a)];
    const P = (r, y) => [u[0] * r, y, u[2] * r];
    const p0 = P(0.11, 0.39), p1 = P(0.27, 0.3), p2 = P(0.25, 0.53), p3 = P(0.15, 0.635);
    b.taper(m.chitin, p0, p1, 0.026, 0.022, 5);
    bulge(b, m.team, P(0.15, 0.36), P(0.25, 0.31), 0.027, 0.85, 5);
    b.ellipsoid(m.metal, 0.03, 0.03, 0.03, ...p1, 5);
    b.taper(m.chitinDark, p1, p2, 0.021, 0.015, 5);
    b.ellipsoid(m.metal, 0.02, 0.02, 0.02, ...p2, 5);
    b.taper(m.bone, p2, p3, 0.015, 0.003, 4);
    spikes(b, m.bone, P(0.265, 0.37), P(0.255, 0.48), 2, 0.038, 0.008, [-u[0], 0.2, -u[2]]);
  }

  // vestigial face below the brain
  b.ellipsoid(m.flesh, 0.052, 0.042, 0.042, 0, 0.41, 0.15, 6);
  b.ellipsoid(m.eye, 0.021, 0.021, 0.016, 0, 0.42, 0.188, 6);
  for (const s of [-1, 1]) b.ellipsoid(m.eye, 0.01, 0.01, 0.01, s * 0.033, 0.402, 0.18, 5);
  b.taper(m.flesh, [0, 0.38, 0.17], [0, 0.32, 0.19], 0.012, 0.003, 4);       // proboscis
  b.octa(m.psy, 0.022, 0, 0.55, 0.15, 0.8, 1.2, 0.6);                       // third-eye gem
  body.add(b.build());

  // the throbbing brain (slow pulse)
  const br = new PartBuilder();
  brain(br, m.flesh, m.flesh, m.psy, 0, 0, 0, 0.17, 0.115, 0.17, { seg: 8, arcs: 2, ts: 6, tube: 0.008 });
  body.add(pivot('pulseBrain', br, 0, 0.5, 0));

  // tilted psychic halo spinning around the brain
  const h = new PartBuilder();
  const tilt = new THREE.Euler(PI / 2 + 0.22, 0, 0);
  h.torus(m.psy, 0.24, 0.007, 3, 18, 0, 0, 0, tilt.x, 0, 0);
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * PI * 2;
    const p = new THREE.Vector3(Math.cos(t) * 0.24, Math.sin(t) * 0.24, 0).applyEuler(tilt);
    h.octa(i % 2 ? m.glow : m.bone, 0.022, p.x, p.y, p.z, 1, 1.4, 1);
  }
  const halo = pivot('spinYHalo', h, 0, 0.5, 0);
  halo.userData.speed = 0.9;
  body.add(halo);
  body.add(marker('muzzle', 0, 0.56, 0.18));
  return root;
}

/** Worker Drone — r 0.15, h 0.35. Lobotomised slave bug with a pick and a mineral sack (`cargo`). */
export function buildWorkerDrone(team) {
  const m = mats(team, F);
  const { root, body } = rigRoot();
  const b = new PartBuilder();

  b.ellipsoid(m.chitinDark, 0.04, 0.035, 0.055, 0, 0.15, -0.05, 7, -0.3, 0, 0);   // abdomen
  b.ellipsoid(m.chitin, 0.042, 0.045, 0.048, 0, 0.18, 0.01, 8, 0.4, 0, 0);       // hunched thorax
  hring(b, m.team, 0.034, 0.032, 0.008, 0, 0.205, 0.04);                          // slave collar
  b.box(m.team, 0.012, 0.075, 0.012, 0.028, 0.19, -0.03, 0.5, 0, 0.3);            // sack strap
  b.box(m.team, 0.012, 0.075, 0.012, -0.028, 0.19, -0.03, 0.5, 0, -0.3);
  // drooping head with a stapled-open skull and a control implant
  b.ellipsoid(m.chitinLight, 0.03, 0.028, 0.032, 0, 0.21, 0.068, 7);
  b.dome(m.flesh, 0.022, 0.013, 0.024, 0, 0.228, 0.062, 6);
  for (const z of [0.05, 0.062, 0.074]) b.box(m.bone, 0.03, 0.004, 0.004, 0, 0.238, z);
  b.taper(m.metal, [0, 0.235, 0.05], [0, 0.275, 0.025], 0.004, 0.003, 4);
  b.ellipsoid(m.organ, 0.009, 0.009, 0.009, 0, 0.278, 0.023, 5);
  eyes(b, m.eye, 0, 0.212, 0.095, 0.007, 0.018);
  b.taper(m.bone, [-0.01, 0.195, 0.09], [-0.004, 0.182, 0.105], 0.004, 0.001, 3);
  b.taper(m.bone, [0.01, 0.195, 0.09], [0.004, 0.182, 0.105], 0.004, 0.001, 3);
  body.add(b.build());

  for (const a of arms(m.chitinDark, { x: 0.042, y: 0.2, z: 0.03, len: 0.09, r: 0.008 }, (ab, s, h) => {
    if (s > 0) { // pick
      ab.taper(m.bone, [h[0], h[1] - 0.04, h[2] - 0.005], [h[0], h[1] + 0.075, h[2] + 0.02], 0.004, 0.0035, 4);
      ab.taper(m.metal, [h[0], h[1] + 0.07, h[2] + 0.018], [h[0], h[1] + 0.045, h[2] + 0.07], 0.008, 0.002, 4);
      ab.taper(m.metal, [h[0], h[1] + 0.07, h[2] + 0.018], [h[0], h[1] + 0.06, h[2] - 0.025], 0.007, 0.002, 4);
    } else {
      ab.taper(m.chitinDark, h, [h[0], h[1] - 0.01, h[2] + 0.02], 0.005, 0.0015, 3);
    }
  })) body.add(a);
  for (const l of bipedLegs(m.chitinDark, { x: 0.028, y: 0.13, r: 0.01, knee: 0.03, footMat: m.chitin })) root.add(l);

  // sack of mineral nodules (origin at its bottom; the game scales Y by load)
  const c = new PartBuilder();
  c.ellipsoid(m.mud, 0.045, 0.05, 0.04, 0, 0.05, 0, 8);
  hring(c, m.team, 0.038, 0.034, 0.006, 0, 0.085, 0);
  c.ico(m.crystal, 0.018, 0, -0.012, 0.1, 0.01);
  c.ico(m.crystal, 0.014, 0, 0.016, 0.097, -0.008);
  c.ico(m.organ, 0.011, 0, 0.002, 0.108, -0.016);
  body.add(pivot('cargo', c, 0, 0.17, -0.075));
  return root;
}

export const MODELS = {
  spitterMaggot: buildSpitterMaggot,
  stagBrawler: buildStagBrawler,
  sniperWasp: buildSniperWasp,
  mindWeaver: buildMindWeaver,
  masterMindWeaver: buildMasterMindWeaver,
  workerDrone: buildWorkerDrone,
};
