// SOVIET defenses — burrowing spiders, subterranean beetles and raised centipedes.
// Dark rust/black plates, bone needles and spikes, toxic-green sacs, cyan electric organs.
import * as THREE from 'three';
import { mats } from '../../render/materials.js';
import { mulberry32 } from '../../core/util.js';
import { PartBuilder, pivot, marker, eyes, chain, mandibles } from '../insectKit.js';

const F = 'soviet';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ local helpers
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _mx = new THREE.Matrix4();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** Add a unit geometry: scaled, then pitched (local X), then yawed (Y), then moved to (x,y,z). */
function put(b, mat, geo, x, y, z, sx = 1, sy = 1, sz = 1, yaw = 0, pitch = 0) {
  _e.set(pitch, yaw, 0, 'YXZ');
  _q.setFromEuler(_e);
  _mx.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  b.addMatrix(mat, geo, _mx);
}

/** Elliptic drum standing on (x,y,z). */
function drum(b, mat, rx, rz, h, x, y, z, seg = 8, top = 1) {
  const g = new THREE.CylinderGeometry(top, 1, 1, seg, 1);
  g.translate(0, 0.5, 0);
  put(b, mat, g, x, y, z, rx, h, rz);
}

/** Open elliptic belt from y to y+h (team bands); `top` narrows the upper edge. */
function belt(b, mat, rx, rz, h, x, y, z, top = 1, seg = 12) {
  const g = new THREE.CylinderGeometry(top, 1, 1, seg, 1, true);
  g.translate(0, 0.5, 0);
  put(b, mat, g, x, y, z, rx, h, rz);
}

/** Lathe profile [[r,y],…] revolved around (x,y,z); run it outside → over the lip → inside. */
function lathe(b, mat, pts, seg, x = 0, y = 0, z = 0) {
  put(b, mat, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), x, y, z);
}

/** Jagged lightning bolt from a to c. */
function bolt(b, mat, a, c, n, jitter, r, seed) {
  const rng = mulberry32(seed);
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = i === n ? c : [0, 1, 2].map((k) => a[k] + (c[k] - a[k]) * t + (rng() - 0.5) * jitter);
    b.taper(mat, prev, p, r, r * 0.8, 3);
    prev = p;
  }
}

// ==================================================================== defenses

/** Gatling Spine Spitter (Sentry Gun) — 1×1, h 0.9. Squatting burrow spider; its abdomen is a 360° needle gatling. */
export function buildSpineSpitter(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // burrow mound with a team-banded rim and soil clods
  b.dome(m.mud, 0.48, 0.16, 0.48, 0, 0, 0, 12);
  b.torus(m.team, 0.43, 0.03, 4, 16, 0, 0.06, 0, Math.PI / 2, 0, 0);
  const rng = mulberry32(17);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng() * 0.5, r = 0.36 + rng() * 0.1;
    b.dodeca(m.mud, 0.04 + rng() * 0.03, Math.cos(a) * r, 0.06, Math.sin(a) * r, 1, 0.7, 1, rng(), rng(), 0);
  }
  // squat cephalothorax at the front: red eye cluster, bone fangs, palps
  b.ellipsoid(m.chitinDark, 0.16, 0.1, 0.17, 0, 0.2, 0.14, 10);
  b.dome(m.chitin, 0.14, 0.07, 0.15, 0, 0.24, 0.12, 8);
  eyes(b, m.eye, 0, 0.27, 0.27, 0.03, 0.045);
  eyes(b, m.eye, 0, 0.3, 0.24, 0.018, 0.085);
  eyes(b, m.eye, 0, 0.31, 0.2, 0.014, 0.03);
  for (const s of [-1, 1]) {
    b.taper(m.chitinDark, [s * 0.05, 0.2, 0.27], [s * 0.05, 0.13, 0.31], 0.035, 0.028, 5);
    b.taper(m.bone, [s * 0.05, 0.13, 0.31], [s * 0.03, 0.05, 0.34], 0.026, 0.004, 5);
    chain(b, m.chitin, [[s * 0.1, 0.18, 0.26, 0.02], [s * 0.15, 0.2, 0.34, 0.016], [s * 0.13, 0.1, 0.4, 0.012]], 5);
  }
  // eight squatting legs, knees hunched high, bone-tipped feet dug into the mound
  for (let i = 0; i < 4; i++) {
    const a = [0.8, 0.28, -0.25, -0.75][i];
    for (const s of [-1, 1]) {
      const hip = [s * 0.12, 0.2, 0.2 - i * 0.09];
      const knee = [hip[0] + s * Math.cos(a) * 0.2, 0.42, hip[2] + Math.sin(a) * 0.2];
      const foot = [hip[0] + s * Math.cos(a) * 0.4, 0.03, hip[2] + Math.sin(a) * 0.4];
      b.taper(m.chitinDark, hip, knee, 0.034, 0.026, 5);
      b.ellipsoid(m.chitin, 0.032, 0.032, 0.032, ...knee, 5);
      b.taper(m.chitinDark, knee, foot, 0.026, 0.012, 5);
      b.taper(m.bone, [foot[0], foot[1] + 0.06, foot[2]], foot, 0.014, 0.003, 4);
      if (i % 2 === 0) b.taper(m.bone, knee, [knee[0] + s * 0.04, knee[1] + 0.08, knee[2]], 0.012, 0.002, 4);
    }
  }
  root.add(b.build());

  // turret: the swollen abdomen, quilled with spare needles, spinnerets turned into a gatling
  const t = new PartBuilder();
  t.ellipsoid(m.chitin, 0.24, 0.2, 0.27, 0, 0.18, -0.04, 12);
  t.dome(m.chitinDark, 0.2, 0.1, 0.225, 0, 0.3, -0.06, 10);
  for (const dz of [-0.16, 0.06]) {
    const k = Math.sqrt(1 - ((dz + 0.04) / 0.27) ** 2) * 1.04;
    put(t, m.team, new THREE.TorusGeometry(1, 0.1, 4, 10, Math.PI), 0, 0.18, dz, 0.24 * k, 0.2 * k + 0.02, 0.3);
  }
  t.octa(m.team, 0.1, 0, 0.405, -0.05, 0.8, 0.2, 1.3);
  const qr = mulberry32(5);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 8)) + (qr() - 0.5) * 0.3, back = -0.08 - qr() * 0.14;
    const base = [Math.cos(a) * 0.14, 0.3 + Math.sin(a) * 0.04, back];
    const dir = new THREE.Vector3(Math.cos(a) * 0.5, 1, -0.6 - qr() * 0.4).normalize().multiplyScalar(0.2 + qr() * 0.08);
    t.taper(m.bone, base, [base[0] + dir.x, base[1] + dir.y, base[2] + dir.z], 0.016, 0.002, 4);
  }
  for (const s of [-1, 1]) t.ellipsoid(m.organ, 0.05, 0.06, 0.08, s * 0.21, 0.13, -0.1, 6);
  t.cyl(m.chitinDark, 0.1, 0.13, 0.1, 7, 0, 0.2, 0.2, Math.PI / 2, 0, 0);
  const turret = pivot('turret', t, 0, 0.3, -0.06);
  // spinning needle barrels
  const g = new PartBuilder();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    g.cyl(m.bone, 0.016, 0.022, 0.3, 5, Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0.15, Math.PI / 2, 0, 0);
  }
  g.cyl(m.chitinDark, 0.085, 0.085, 0.05, 6, 0, 0, 0.05, Math.PI / 2, 0, 0);
  g.cyl(m.metal, 0.078, 0.078, 0.035, 6, 0, 0, 0.25, Math.PI / 2, 0, 0);
  g.ellipsoid(m.organ, 0.03, 0.03, 0.05, 0, 0, 0.08, 5);
  const spin = pivot('spinZ', g, 0, 0.2, 0.2);
  spin.userData.speed = 9;
  turret.add(spin);
  turret.add(marker('muzzle', 0, 0.2, 0.52));
  root.add(turret);
  return root;
}

/** Spore Burst Mortar (Flak Cannon) — 1×1, h 1.2. Heavy beetle rearing out of its burrow, maw aimed at the sky. */
export function buildSporeMortar(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  // sunken mastic burrow with team band and bone stakes
  lathe(b, m.mud, [[0.5, 0], [0.47, 0.18], [0.41, 0.3], [0.36, 0.29], [0.33, 0.12]], 12);
  b.cyl(m.dark, 0.34, 0.34, 0.02, 12, 0, 0.11, 0);
  belt(b, m.team, 0.498, 0.498, 0.07, 0, 0.06, 0, 0.975, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.5, c = Math.cos(a), s = Math.sin(a);
    b.taper(m.bone, [c * 0.43, 0.22, s * 0.43], [c * 0.6, 0.42, s * 0.6], 0.035, 0.004, 5);
  }
  // spare volatile seed sacs stacked beside the burrow
  for (const [x, z, r] of [[0.46, -0.32, 0.09], [0.55, -0.14, 0.075], [0.35, -0.47, 0.07]]) {
    b.ellipsoid(m.organ, r, r * 1.1, r, x, r, z, 7);
    b.dome(m.chitinDark, r * 0.8, r * 0.5, r * 0.8, x, r * 1.6, z, 6);
    b.taper(m.chitinDark, [x, r * 2.0, z], [x, r * 2.6, z], r * 0.3, 0.004, 4);
  }
  root.add(b.build());

  // turret: the beetle, built upright and then tilted toward its target
  const TILT = 0.35;
  const k = new PartBuilder();
  k.ellipsoid(m.chitinDark, 0.27, 0.38, 0.23, 0, 0.3, 0, 12);
  // rust elytra on the back, team-striped, split by a black seam
  for (const s of [-1, 1]) {
    k.dome(m.chitin, 0.14, 0.12, 0.36, s * 0.135, 0.32, -0.12, 8, -Math.PI / 2, 0, 0);
    k.dome(m.team, 0.05, 0.123, 0.32, s * 0.17, 0.32, -0.122, 6, -Math.PI / 2, 0, 0);
  }
  k.box(m.chitinDark, 0.025, 0.66, 0.04, 0, 0.32, -0.235);
  belt(k, m.team, 0.272, 0.232, 0.06, 0, 0.17, 0, 1, 12);
  // rust belly sternites
  for (const [yy, w] of [[0.3, 0.2], [0.42, 0.19], [0.54, 0.16]]) k.ellipsoid(m.chitin, w, 0.045, 0.06, 0, yy, 0.2, 8);
  // armoured pronotum with outward bone horns
  k.ellipsoid(m.chitin, 0.25, 0.12, 0.22, 0, 0.64, -0.02, 10);
  k.dome(m.chitinDark, 0.2, 0.06, 0.18, 0, 0.7, -0.04, 8);
  for (const s of [-1, 1]) chain(k, m.bone, [[s * 0.2, 0.64, -0.04, 0.05], [s * 0.3, 0.76, -0.08, 0.035], [s * 0.34, 0.92, -0.06, 0.012]], 5, false);
  // launch maw at the head with a primed seed sac
  k.cyl(m.chitinDark, 0.13, 0.15, 0.2, 8, 0, 0.78, 0.04);
  k.torus(m.metal, 0.125, 0.035, 4, 10, 0, 0.88, 0.04, Math.PI / 2, 0, 0);
  k.ellipsoid(m.organ, 0.1, 0.08, 0.1, 0, 0.89, 0.04, 8);
  eyes(k, m.eye, 0, 0.74, 0.17, 0.032, 0.12);
  for (const s of [-1, 1]) chain(k, m.bone, [[s * 0.14, 0.76, 0.1, 0.045], [s * 0.18, 0.9, 0.11, 0.034], [s * 0.09, 1.02, 0.08, 0.014]], 5);
  // forelegs feeding the next sac up the belly
  for (const s of [-1, 1]) {
    chain(k, m.chitinDark, [[s * 0.22, 0.38, 0.12, 0.034], [s * 0.3, 0.52, 0.24, 0.028], [s * 0.12, 0.64, 0.3, 0.02]], 5);
  }
  k.ellipsoid(m.organ, 0.08, 0.1, 0.08, 0, 0.6, 0.29, 7);
  k.dome(m.chitinDark, 0.065, 0.045, 0.065, 0, 0.69, 0.29, 6);
  k.ellipsoid(m.organ, 0.065, 0.08, 0.065, 0, 0.4, 0.26, 6);
  const tilt = new THREE.Group();
  tilt.rotation.x = TILT;
  tilt.add(k.build());
  const turret = pivot('turret', null, 0, 0.18, 0);
  turret.add(tilt);
  const my = 0.98, mz = 0.04;
  turret.add(marker('muzzle', 0, my * Math.cos(TILT) - mz * Math.sin(TILT), my * Math.sin(TILT) + mz * Math.cos(TILT)));
  root.add(turret);
  return root;
}

/** Bio-Electric Sting Pylon (Tesla Coil) — 1×1, h 2.6. Coiled giant centipede reared upright, arcing between gold-tipped antennae. */
export function buildStingPylon(team) {
  const m = mats(team, F);
  const root = new THREE.Group();
  const b = new PartBuilder();
  drum(b, m.chitinDark, 0.5, 0.5, 0.06, 0, 0, 0, 8);
  drum(b, m.mud, 0.46, 0.46, 0.1, 0, 0.06, 0, 8, 0.9);
  belt(b, m.team, 0.47, 0.47, 0.04, 0, 0.08, 0, 0.99, 8);
  const plate = (i) => (i % 3 === 2 ? m.team : i % 2 ? m.chitin : m.chitinDark);
  // bone stakes pinning the raised torso
  for (let i = 0; i < 3; i++) {
    const a = i * (TAU / 3) + 0.3, c = Math.cos(a), s = Math.sin(a);
    chain(b, m.bone, [[c * 0.44, 0.14, s * 0.44, 0.05], [c * 0.42, 0.55, s * 0.42, 0.04], [c * 0.26, 0.9, s * 0.26, 0.028], [c * 0.2, 1.0, s * 0.2, 0.01]], 4, false);
  }
  // coiled tail end: one turn spiralling inward and up, legs splayed into the plinth
  let last = null;
  for (let i = 0; i < 10; i++) {
    const a = i * 0.62 + 0.6, r = 0.33 - i * 0.012, y = 0.25 + i * 0.022;
    const c = Math.cos(a), s = Math.sin(a), x = c * r, z = s * r, kk = 0.82 + i * 0.025;
    b.ellipsoid(m.chitinDark, 0.15 * kk, 0.09 * kk, 0.12 * kk, x, y, z, 6, 0, -a, 0);
    b.ellipsoid(plate(i), 0.155 * kk, 0.06 * kk, 0.09 * kk, x, y + 0.03 * kk, z, 6, 0, -a, 0);
    const p1 = [x + c * 0.25, y + 0.02, z + s * 0.25];
    b.taper(m.chitinDark, [x + c * 0.1, y, z + s * 0.1], p1, 0.022, 0.015, 3);
    b.taper(m.bone, p1, [p1[0] + c * 0.06, 0.16, p1[2] + s * 0.06], 0.015, 0.004, 3);
    last = [x, y, z];
  }
  // raised torso: stacked segments, legs bristling sideways, electrocytes glowing down the belly
  const col = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = last[0] * (1 - Math.min(1, t * 3)) + 0.03 * Math.sin(i * 0.7);
    const z = last[2] * (1 - Math.min(1, t * 3)) + 0.02 * Math.cos(i * 0.6);
    col.push([x, 0.52 + i * 0.155, z]);
  }
  col.forEach(([x, y, z], i) => {
    const kk = 1.08 - i * 0.02;
    b.ellipsoid(m.chitinDark, 0.15 * kk, 0.09, 0.14 * kk, x, y, z, 6);
    b.ellipsoid(plate(i + 1), 0.16 * kk, 0.075, 0.09 * kk, x, y + 0.012, z - 0.065 * kk, 6);
    if (i % 2 === 0) b.ellipsoid(m.spark, 0.045, 0.04, 0.035, x, y, z + 0.13 * kk, 5);
    for (const s of [-1, 1]) {
      const p1 = [x + s * 0.25, y - 0.02, z + 0.04];
      b.taper(m.chitin, [x + s * 0.12, y, z], p1, 0.02, 0.014, 3);
      b.taper(m.bone, p1, [x + s * 0.29, y - 0.14, z + 0.07], 0.014, 0.003, 3);
    }
  });
  const top = col[col.length - 1];
  // head with gold collar
  b.torus(m.brass, 0.13, 0.03, 4, 10, top[0], top[1] + 0.07, top[2], Math.PI / 2, 0, 0);
  b.ellipsoid(m.chitinDark, 0.16, 0.11, 0.18, top[0], top[1] + 0.16, top[2] + 0.03, 8);
  b.dome(m.chitin, 0.15, 0.06, 0.16, top[0], top[1] + 0.21, top[2] + 0.0, 8);
  eyes(b, m.eye, top[0], top[1] + 0.19, top[2] + 0.17, 0.026, 0.085);
  root.add(b.build());
  // venom forcipules (open when the pylon discharges)
  for (const md of mandibles(m.bone, { y: top[1] + 0.12, z: top[2] + 0.16, len: 0.15, r: 0.026, curve: 0.9, teethMat: m.chitinDark })) {
    md.position.x = top[0] + (md.name === 'mandL' ? -0.08 : 0.08);
    root.add(md);
  }
  // lyre of segmented, gold-tipped antennae; the arc jumps between the tips
  const hx = top[0], hy = top[1] + 0.25, hz = top[2] + 0.03;
  for (const s of [-1, 1]) {
    const f = new PartBuilder();
    const pts = [[0, 0, 0, 0.036], [s * 0.15, 0.09, -0.02, 0.032], [s * 0.26, 0.2, -0.03, 0.027], [s * 0.25, 0.32, -0.02, 0.022], [s * 0.1, 0.4, 0, 0.018]];
    chain(f, m.chitinDark, pts, 5);
    for (const k of [1, 2, 3]) f.torus(m.spark, pts[k][3] * 1.6, 0.009, 3, 6, pts[k][0], pts[k][1], pts[k][2], Math.PI / 2, 0, 0);
    f.ellipsoid(m.brass, 0.045, 0.055, 0.045, ...pts[4].slice(0, 3), 6);
    f.ellipsoid(m.photon, 0.025, 0.025, 0.025, pts[4][0], pts[4][1] + 0.04, pts[4][2], 5);
    root.add(pivot(s < 0 ? 'antL' : 'antR', f, hx + s * 0.06, hy, hz));
  }
  const ay = hy + 0.42;
  const arc = new PartBuilder();
  bolt(arc, m.spark, [-0.15, 0, 0], [0.15, 0, 0], 5, 0.08, 0.016, 3);
  bolt(arc, m.spark, [-0.15, 0, 0], [0.15, 0, 0], 4, 0.1, 0.011, 8);
  arc.ellipsoid(m.spark, 0.05, 0.05, 0.05, 0, 0, 0, 6);
  root.add(pivot('glowArc', arc, hx, ay, hz));
  root.add(marker('muzzle', hx, ay, hz));
  return root;
}

export const MODELS = {
  spineSpitter: buildSpineSpitter,
  sporeMortar: buildSporeMortar,
  stingPylon: buildStingPylon,
};
